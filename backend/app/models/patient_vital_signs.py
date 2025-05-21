from sqlalchemy import Column, Integer, Date, ForeignKey, String
from core.config import Base

class PatientVitalSigns(Base):
    __tablename__ = "patient_vital_signs"

    patient_id = Column(Integer, ForeignKey("patients.patient_id"), primary_key=True)
    vital_sign_id = Column(Integer, ForeignKey("vital_signs_dict.vital_sign_id"), primary_key=True)
    measurement_date = Column(Date, primary_key=True)
    value = Column(String(20), nullable=True)
