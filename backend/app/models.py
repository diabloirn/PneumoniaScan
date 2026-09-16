from sqlalchemy import Column, Integer, String, Enum, Float, DateTime
from sqlalchemy.sql import func
from .db import Base
import enum


class PredictionResultEnum(str, enum.Enum):
    Normal = "Normal"
    Pneumonia = "Pneumonia"


class PredictionHistory(Base):
    __tablename__ = "prediction_history"

    id = Column(Integer, primary_key=True, index=True)
    image_filename = Column(String(255), nullable=False)
    image_path = Column(String(255), nullable=False)
    prediction_result = Column(Enum(PredictionResultEnum), nullable=False)
    confidence_score = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


