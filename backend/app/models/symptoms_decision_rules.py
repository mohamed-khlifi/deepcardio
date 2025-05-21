from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from core.config import Base

class SymptomsDecisionRule(Base):
    __tablename__ = "symptoms_decision_rules"

    rule_id = Column(Integer, primary_key=True, autoincrement=True)
    symptom_id = Column(Integer, ForeignKey("symptom_dict.symptom_id"))
    age_group = Column(String(20), nullable=True)
    gender = Column(Enum("Male", "Female"), nullable=True)
    follow_up_action_key = Column(String(255), nullable=True)
    recommendation_key = Column(String(255), nullable=True)
    referral_key = Column(String(255), nullable=True)
    risk_key = Column(String(255), nullable=True)
    life_style_advice_key = Column(String(255), nullable=True)
    presumptive_diagnosis_key = Column(String(255), nullable=True)
    tests_key = Column(String(255), nullable=True)
