from sqlalchemy import Column, Integer, ForeignKey, PrimaryKeyConstraint
from core.config import Base

class DoctorPatient(Base):
    __tablename__ = "doctor_patient"

    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint("doctor_id", "patient_id"),
    )
