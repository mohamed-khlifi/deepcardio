# File: backend/app/models/patient_follow_up_action.py

from sqlalchemy import Column, Integer, Text, String, ForeignKey, TIMESTAMP, func
from core.config import Base

class PatientFollowUpAction(Base):
    __tablename__ = "patient_follow_up_actions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(
        Integer,
        ForeignKey("patients.patient_id", ondelete="CASCADE"),
        nullable=False,
    )
    action = Column(Text, nullable=False)
    follow_up_interval = Column(String(50), nullable=True)
    created_at = Column(
        TIMESTAMP, server_default=func.now(), nullable=False
    )
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), server_onupdate=func.now(), nullable=False
    )
