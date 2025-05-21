from sqlalchemy import Column, Integer, String, Enum, ForeignKey, Text
from core.config import Base

class PersonalHistoryDecisionRule(Base):
    __tablename__ = "personal_history_decision_rules"

    rule_id = Column(Integer, primary_key=True, autoincrement=True)
    history_id = Column(Integer, ForeignKey("personal_history_dict.id"))
    age_group = Column(String(20), nullable=True)  # '18_to_44', '45_to_60', etc.
    gender = Column(Enum("Male", "Female"), nullable=True)
    follow_up_action_key = Column(String(20), nullable=True)
    recommendation_key = Column(String(255), nullable=True)
    referral_key = Column(String(255), nullable=True)
    risk_key = Column(String(255), nullable=True)
    life_style_advice_key = Column(String(20), nullable=True)
    presumptive_diagnosis_key = Column(String(255), nullable=True)
    tests_key = Column(String(20), nullable=True)
