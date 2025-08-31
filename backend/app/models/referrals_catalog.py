from sqlalchemy import Column, Integer, String, Text
from backend.app.core.config import Base

class ReferralsCatalog(Base):
    __tablename__ = "referrals_catalog"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    referral_key = Column(String(255), nullable=False, unique=True)
    specialist_name = Column(String(255), nullable=False)
    referral_reason = Column(Text, nullable=False)
