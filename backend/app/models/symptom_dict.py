from sqlalchemy import Column, Integer, String, Text
from core.config import Base

class SymptomDict(Base):
    __tablename__ = "symptom_dict"

    symptom_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False, unique=True)
    category = Column(String(100))
    description = Column(Text)
