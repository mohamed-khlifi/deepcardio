# backend/app/models/patient_lifestyle_advices_schema.py

from pydantic import BaseModel
from typing import Optional

class PatientLifestyleAdvicesBase(BaseModel):
    patient_id: int
    life_style_advice: str

class PatientLifestyleAdvicesCreate(PatientLifestyleAdvicesBase):
    """
    When the client POSTS to /patient-lifestyle-advices, they must supply:
      - patient_id (int)
      - life_style_advice (str)
    """
    pass

class PatientLifestyleAdvicesUpdate(BaseModel):
    """
    When the client PUTs to /patient-lifestyle-advices/{advice_id},
    they may update:
      - life_style_advice (str)
      - patient_id (int) - required for catalog item conversions
    """
    life_style_advice: Optional[str] = None
    patient_id: Optional[int] = None

class PatientLifestyleAdvicesOut(PatientLifestyleAdvicesBase):
    """
    What we return on GET /patient-lifestyle-advices and PUT /patient-lifestyle-advices/{id}:
      - id                 (int)
      - patient_id         (int)
      - life_style_advice  (str)
      - created_at         (timestamp as string)
      - updated_at         (timestamp as string)
    """
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
