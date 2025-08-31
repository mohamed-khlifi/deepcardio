from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey, String
from sqlalchemy.sql import func
from backend.app.core.config import Base

class PatientVitalSigns(Base):
    __tablename__ = "patient_vital_signs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False)
    vital_sign_id = Column(Integer, ForeignKey("vital_signs_dict.vital_sign_id", ondelete="CASCADE"), nullable=False)
    measurement_date = Column(Date, nullable=True)
    value = Column(String(20), nullable=True)
    recorded_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    resolved_at = Column(DateTime, nullable=True)