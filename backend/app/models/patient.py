from sqlalchemy import Column, Integer, String, Date, Enum
from core.config import Base

class Patient(Base):
    __tablename__ = "patients"

    patient_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    gender = Column(Enum("Male", "Female"), nullable=False)
    dob = Column(Date, nullable=False)
    ethnicity = Column(String(50))
    phone = Column(String(20))
    email = Column(String(100))
    marital_status = Column(String(50))
    occupation = Column(String(100))
    insurance_provider = Column(String(100))
    address = Column(String(255))
