from sqlalchemy import Column, Integer, String, Text
from core.config import Base

class FollowUpActionCatalog(Base):
    __tablename__ = "follow_up_actions_catalog"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    follow_up_action_key = Column(String(255), nullable=False, unique=True)
    interval = Column(String(50), nullable=False)
    action = Column(Text, nullable=False)
