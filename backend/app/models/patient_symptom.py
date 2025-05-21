from sqlalchemy import Column, Integer, Date, ForeignKey
from core.config import Base

class PatientSymptom(Base):
    __tablename__ = "patient_symptom"

    patient_id = Column(Integer, ForeignKey("patients.patient_id"), primary_key=True)
    symptom_id = Column(Integer, ForeignKey("symptom_dict.symptom_id"), primary_key=True)
    onset_date = Column(Date, nullable=True)
