from sqlalchemy import Column, Integer, Date, ForeignKey
from core.config import Base

class PatientPersonalHistory(Base):
    __tablename__ = "patient_personal_history"

    patient_id = Column(Integer, ForeignKey("patients.patient_id"), primary_key=True)
    history_id = Column(Integer, ForeignKey("personal_history_dict.id"), primary_key=True)
    date_recorded = Column(Date, primary_key=True)
