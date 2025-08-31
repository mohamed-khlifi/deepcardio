from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend.app.core.config import Base

class PatientSymptom(Base):
    __tablename__ = "patient_symptom"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False)
    symptom_id = Column(Integer, ForeignKey("symptom_dict.symptom_id", ondelete="CASCADE"), nullable=False)
    onset_date = Column(Date, nullable=True)
    recorded_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    resolved_at = Column(DateTime, nullable=True)