# File: backend/app/models/personal_history.py
from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend.app.core.config import Base

class PatientHistory(Base):
    __tablename__ = "patient_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False)
    history_id = Column(Integer, ForeignKey("personal_history_dict.history_id", ondelete="CASCADE"), nullable=False)
    date_recorded = Column(Date, nullable=True)
    recorded_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    resolved_at = Column(DateTime, nullable=True)