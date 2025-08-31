from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from backend.app.core.config import Base

class TestsDecisionRule(Base):
    __tablename__ = "tests_decision_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    test_id = Column(String(100), ForeignKey("tests_dict.id"))
    age_group = Column(String(20), nullable=True)
    gender = Column(Enum("Male", "Female"), nullable=True)
    follow_up_action_key = Column(String(20), nullable=True)
    recommendation_key = Column(String(255), nullable=True)
    referral_key = Column(String(255), nullable=True)
    risk_key = Column(String(255), nullable=True)
    life_style_advice_key = Column(String(20), nullable=True)
    presumptive_diagnosis_key = Column(String(20), nullable=True)
    min_value = Column(String(20), nullable=True)  # ✅ Just ensure DB column exists
    max_value = Column(String(20), nullable=True)

