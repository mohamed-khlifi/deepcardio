from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class PatientSymptomCreate(BaseModel):
    patient_id: int
    symptom_id: int
    onset_date: Optional[date] = None

class PatientSymptomResponse(BaseModel):
    id: int
    patient_id: int
    symptom_id: int
    onset_date: Optional[date] = None
    recorded_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SymptomDictResponse(BaseModel):
    symptom_id: int
    name: str
    category: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True