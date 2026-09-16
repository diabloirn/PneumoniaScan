from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
import shutil
import time
import os
from typing import List
from datetime import datetime, timedelta
from collections import defaultdict
import base64

from .db import Base, engine, get_db
from .models import PredictionHistory, PredictionResultEnum
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from dotenv import load_dotenv
from .ml import preprocess_image, predict_with_model_or_dummy, load_model_if_available
from typing import Optional
import os



BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


load_dotenv()

app = FastAPI(title="Pneumonia Detection API")

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins: List[str] = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    load_model_if_available()


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/model/status")
def model_status():
    from .ml import load_model_if_available

    model_loaded = load_model_if_available()
    
    return {
        "model_loaded": model_loaded,
        "model_type": "real" if model_loaded else "dummy",
        "status": "Model CNN real tersedia" if model_loaded else "Menggunakan model dummy"
    }


@app.post("/api/predict")
async def predict(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    timestamp = int(time.time())
    safe_name = f"{timestamp}_{file.filename}"
    save_path = UPLOAD_DIR / safe_name

    try:
        with save_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    pre = preprocess_image(save_path)
    prediction, confidence, model_type = predict_with_model_or_dummy(pre)

    record = PredictionHistory(
        image_filename=file.filename,
        image_path=str(save_path),
        prediction_result=PredictionResultEnum(prediction),
        confidence_score=float(confidence),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    result = {
        "prediction": prediction,
        "confidence_score": confidence,
        "model_type": model_type,
        "filename": file.filename,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "id": record.id,
    }

    return JSONResponse(result)


@app.get("/api/history")
def get_history(
    limit: Optional[int] = 50, 
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(PredictionHistory)

    if category and category.lower() in ['normal', 'pneumonia']:
        q = q.filter(PredictionHistory.prediction_result == PredictionResultEnum(category.title()))
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            q = q.filter(PredictionHistory.created_at >= start_dt)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            q = q.filter(PredictionHistory.created_at <= end_dt)
        except ValueError:
            pass
    
    q = q.order_by(PredictionHistory.created_at.desc()).limit(max(1, min(int(limit or 50), 500)))
    
    items = []
    for r in q.all():
        items.append(
            {
                "id": r.id,
                "image_filename": r.image_filename,
                "image_path": r.image_path,
                "prediction_result": r.prediction_result.value if hasattr(r.prediction_result, "value") else str(r.prediction_result),
                "confidence_score": r.confidence_score,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
        )
    return {"items": items}


@app.get("/api/history/{item_id}")
def get_history_detail(item_id: int, db: Session = Depends(get_db)):
    rec = db.query(PredictionHistory).filter(PredictionHistory.id == item_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")

    image_base64 = None
    if rec.image_path and os.path.exists(rec.image_path):
        try:
            with open(rec.image_path, "rb") as img_file:
                image_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        except Exception:
            pass
    
    return {
        "id": rec.id,
        "image_filename": rec.image_filename,
        "image_path": rec.image_path,
        "image_base64": image_base64,
        "prediction_result": rec.prediction_result.value if hasattr(rec.prediction_result, "value") else str(rec.prediction_result),
        "confidence_score": rec.confidence_score,
        "created_at": rec.created_at.isoformat() if rec.created_at else None,
    }


@app.get("/api/chart/trend")
def get_chart_trend(days: int = 30, db: Session = Depends(get_db)):
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    daily_data = (
        db.query(
            func.date(PredictionHistory.created_at).label('date'),
            PredictionHistory.prediction_result,
            func.count(PredictionHistory.id).label('count')
        )
        .filter(PredictionHistory.created_at >= start_date)
        .group_by(func.date(PredictionHistory.created_at), PredictionHistory.prediction_result)
        .all()
    )
    
    trend_data = defaultdict(lambda: {'normal': 0, 'pneumonia': 0})
    for row in daily_data:
        if hasattr(row.date, 'strftime'):
            date_str = row.date.strftime('%Y-%m-%d')
        else:
            date_str = str(row.date)
        result = row.prediction_result.value.lower() if hasattr(row.prediction_result, 'value') else str(row.prediction_result).lower()
        trend_data[date_str][result] = row.count
  
    dates = sorted(trend_data.keys())
    normal_counts = [trend_data[date]['normal'] for date in dates]
    pneumonia_counts = [trend_data[date]['pneumonia'] for date in dates]
    
    return {
        "dates": dates,
        "normal": normal_counts,
        "pneumonia": pneumonia_counts,
        "total": [normal_counts[i] + pneumonia_counts[i] for i in range(len(dates))]
    }




@app.delete("/api/history/{item_id}")
def delete_history(item_id: int, db: Session = Depends(get_db)):
    rec = db.query(PredictionHistory).filter(PredictionHistory.id == item_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        if rec.image_path and os.path.exists(rec.image_path):
            os.remove(rec.image_path)
    except Exception:
        pass
    db.delete(rec)
    db.commit()
    return {"ok": True}


