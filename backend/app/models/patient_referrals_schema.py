# backend/app/models/patient_referrals_schema.py

from pydantic import BaseModel
from typing import Optional

class PatientReferralsBase(BaseModel):
    patient_id: int
    specialist_name: str
    referral_reason: str

class PatientReferralsCreate(PatientReferralsBase):
    """
    When the client POSTS to /patient-referrals, they must supply:
      - patient_id (int)
      - specialist_name (str)
      - referral_reason (str)
    """
    pass

class PatientReferralsUpdate(BaseModel):
    """
    When the client PUTs to /patient-referrals/{referral_id},
    they may update:
      - specialist_name (str)
      - referral_reason (str)
      - patient_id (int) - required for catalog item conversions
    """
    specialist_name: Optional[str] = None
    referral_reason: Optional[str] = None
    patient_id: Optional[int] = None

class PatientReferralsOut(PatientReferralsBase):
    """
    What we return on GET /patient-referrals and PUT /patient-referrals/{id}:
      - id                 (int)
      - patient_id         (int)
      - specialist_name    (str)
      - referral_reason    (str)
      - created_at         (timestamp as string)
      - updated_at         (timestamp as string)
    """
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
