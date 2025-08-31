from sqlalchemy import Column, Integer, String, Date, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend.app.core.config import Base

class PatientTests(Base):
    __tablename__ = "patient_tests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False)
    test_id = Column(String(100), ForeignKey("tests_dict.id", ondelete="CASCADE"), nullable=False)
    test_date = Column(Date, nullable=True)
    result_value = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    resolved_at = Column(DateTime, nullable=True)