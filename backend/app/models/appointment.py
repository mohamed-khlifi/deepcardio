# File: models/appointment.py
from sqlalchemy import Column, Integer, DateTime, String, ForeignKey
from core.config import Base

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=False)

    # map Python attribute `datetime` to DB column `appointment_datetime`
    datetime = Column(
        "appointment_datetime",  # <-- actual column name
        DateTime,
        nullable=False,
    )

    # map Python attribute `type` to DB column `appointment_type`
    type = Column(
        "appointment_type",  # <-- actual column name
        String(50),
        nullable=False,
    )
