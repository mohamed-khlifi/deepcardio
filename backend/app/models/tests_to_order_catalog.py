from sqlalchemy import Column, Integer, String, Text
from backend.app.core.config import Base

class TestsToOrderCatalog(Base):
    __tablename__ = "tests_to_order_catalog"

    id = Column(Integer, primary_key=True, autoincrement=True)
    test_to_order_key = Column(String(255), nullable=False, unique=True)
    test_to_order = Column(Text, nullable=False)
