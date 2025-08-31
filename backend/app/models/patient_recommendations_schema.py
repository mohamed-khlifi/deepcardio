# backend/app/models/patient_recommendations_schema.py

from pydantic import BaseModel
from typing import Optional

class PatientRecommendationsBase(BaseModel):
    patient_id: int
    recommendation: str

class PatientRecommendationsCreate(PatientRecommendationsBase):
    """
    When the client POSTS to /patient-recommendations, they must supply:
      - patient_id (int)
      - recommendation (str)
    """
    pass

class PatientRecommendationsUpdate(BaseModel):
    """
    When the client PUTs to /patient-recommendations/{recommendation_id},
    they may update:
      - recommendation (str)
      - patient_id (int) - required for catalog item conversions
    """
    recommendation: Optional[str] = None
    patient_id: Optional[int] = None

class PatientRecommendationsOut(PatientRecommendationsBase):
    """
    What we return on GET /patient-recommendations and PUT /patient-recommendations/{id}:
      - id                 (int)
      - patient_id         (int)
      - recommendation     (str)
      - created_at         (timestamp as string)
      - updated_at         (timestamp as string)
    """
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
