from sqlalchemy import Column, String
from backend.app.core.config import Base

class TestsDict(Base):
    __tablename__ = "tests_dict"

    id = Column(String(100), primary_key=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100))
    units = Column(String(50))
    min_value = Column(String(50))
    max_value = Column(String(50))