from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func
from backend.app.core.config import Base

class PatientPresumptiveDiagnoses(Base):
    __tablename__ = "patient_presumptive_diagnoses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnosis_name = Column(Text, nullable=False)
    confidence_level = Column(String(50), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    auto_generated = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(DateTime, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
