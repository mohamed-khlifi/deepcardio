from sqlalchemy import Column, Integer, String, Text
from backend.app.core.config import Base

class LifeStyleAdvicesCatalog(Base):
    __tablename__ = "life_style_advices_catalog"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    life_style_advice_key = Column(String(255), nullable=False, unique=True)
    life_style_advice = Column(Text, nullable=False)

