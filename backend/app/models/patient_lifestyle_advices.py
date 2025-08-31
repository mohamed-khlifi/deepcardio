from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func
from backend.app.core.config import Base

class PatientLifestyleAdvices(Base):
    __tablename__ = "patient_lifestyle_advices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    life_style_advice = Column(Text, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    auto_generated = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(DateTime, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
