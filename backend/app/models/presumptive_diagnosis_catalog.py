from sqlalchemy import Column, Integer, String, Text
from backend.app.core.config import Base

class PresumptiveDiagnosisCatalog(Base):
    __tablename__ = "presumptive_diagnosis_catalog"

    id = Column(Integer, primary_key=True, autoincrement=True)
    presumptive_diagnosis_key = Column(String(255), unique=True, nullable=False)
    diagnosis_name = Column(Text, nullable=False)
    confidence_level = Column(String(50), nullable=False)
