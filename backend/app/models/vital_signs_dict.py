from sqlalchemy import Column, Integer, String
from backend.app.core.config import Base

class VitalSignsDict(Base):
    __tablename__ = "vital_signs_dict"

    vital_sign_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False, unique=True)
    category = Column(String(100))
    min_value = Column(String(20))
    max_value = Column(String(20))
    unit = Column(String(20))
