from sqlalchemy import Column, String, Integer, Date, Text, ForeignKey
from core.config import Base

class PatientTests(Base):
    __tablename__ = "patient_tests"

    patient_id = Column(Integer, ForeignKey("patients.patient_id"), primary_key=True)
    test_id = Column(String(100), ForeignKey("tests_dict.id"), primary_key=True)
    test_date = Column(Date, primary_key=True)
    result_value = Column(String(50))
    notes = Column(Text)
