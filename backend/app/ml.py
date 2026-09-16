from pathlib import Path
from typing import Tuple, Optional
import os
import numpy as np
from PIL import Image

_tf = None
_model = None
_model_loaded = False

def _try_import_tf():
    global _tf
    if _tf is None:
        try:
            import tensorflow as tf  
            _tf = tf
        except Exception:
            _tf = None
    return _tf


def get_threshold() -> float:
    try:
        return float(os.getenv("THRESHOLD", "0.5"))
    except Exception:
        return 0.5


def preprocess_image(image_path: Path, target_size: Tuple[int, int] = (224, 224)) -> np.ndarray:
    """Load image, convert to RGB, resize, normalize to 0..1, shape (1,H,W,3)."""
    with Image.open(image_path) as img:
        img = img.convert("RGB")
        img = img.resize(target_size)
        arr = np.asarray(img, dtype=np.float32) / 255.0
        # Jika saat training menggunakan normalisasi mean/std, tambahkan di sini:
        # mean = np.array([0.485, 0.456, 0.406])
        # std = np.array([0.229, 0.224, 0.225])
        # arr = (arr - mean) / std
        arr = np.expand_dims(arr, axis=0)
        return arr


def dummy_predict(preprocessed: np.ndarray) -> Tuple[str, float]:
    mean_val = float(preprocessed.mean())
    if mean_val < 0.5:
        return "Pneumonia", 0.87
    return "Normal", 0.76


def load_model_if_available(model_path: Optional[str] = None) -> bool:
    global _model, _model_loaded
    if _model_loaded:
        return _model is not None
    tf = _try_import_tf()
    if tf is None:
        print("TensorFlow not available")
        _model_loaded = True
        _model = None
        return False

    possible_paths = [
        model_path,
        os.getenv("MODEL_PATH"),
        str(Path(__file__).resolve().parent.parent / "models" / "pneumonia_simple_cnn.h5"),
        str(Path(__file__).resolve().parent.parent.parent / "models" / "pneumonia_simple_cnn.h5"),
        "../models/pneumonia_simple_cnn.h5",
        "../../models/pneumonia_simple_cnn.h5",
    ]
    
    model_file = None
    for path in possible_paths:
        if path and Path(path).exists():
            model_file = path
            break
    
    if not model_file:
        print(f"Model file not found. Tried paths: {possible_paths}")
        _model_loaded = True
        _model = None
        return False
    
    try:
        print(f"Loading model from: {model_file}")
        _model = tf.keras.models.load_model(str(model_file))
        _model_loaded = True
        print("Model loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading model: {e}")
        _model = None
        _model_loaded = True
        return False


def predict_with_model_or_dummy(preprocessed: np.ndarray) -> Tuple[str, float, str]:
    if not _model_loaded:
        load_model_if_available()
    threshold = get_threshold()
    if _model is not None:
        print(f"Using REAL CNN model for prediction (threshold={threshold})")
        preds = _model.predict(preprocessed, verbose=0)
        if preds.ndim == 2 and preds.shape[1] == 1:
            p_pneu = float(preds[0, 0])
        elif preds.ndim == 2 and preds.shape[1] >= 2:
            p_pneu = float(preds[0, 1])
        else:
            p_pneu = float(preds.ravel()[0])
        print(f"[DEBUG] Model output: {p_pneu}, threshold: {threshold}")
        if p_pneu >= threshold:
            return "Pneumonia", p_pneu, "real"
        return "Normal", 1.0 - p_pneu, "real"
    print("Using DUMMY model for prediction - confidence scores are NOT accurate")
    prediction, confidence = dummy_predict(preprocessed)
    return prediction, confidence, "dummy"


