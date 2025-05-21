from sqlalchemy import Column, Integer, String, Text
from core.config import Base

class RecommendationsCatalog(Base):
    __tablename__ = "recommendations_catalog"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    recommendation_key = Column(String(255), nullable=False, unique=True)
    recommendation_value = Column(Text, nullable=False)
