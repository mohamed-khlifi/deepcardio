from sqlalchemy import Column, Integer, String
from core.config import Base

class PersonalHistoryDict(Base):
    __tablename__ = "personal_history_dict"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
