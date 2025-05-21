from sqlalchemy import Column, Integer, String, Text
from core.config import Base

class RiskCatalog(Base):
    __tablename__ = "risk_catalog"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    risk_key = Column(String(255), nullable=False, unique=True)
    value = Column(String(50), nullable=False)
    reason = Column(Text, nullable=False)
