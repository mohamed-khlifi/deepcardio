from pydantic import BaseModel
from datetime import date
from typing import Optional

class PatientSymptomCreate(BaseModel):
    patient_id: int
    symptom_id: int
    onset_date: date

class PatientSymptomResponse(BaseModel):
    patient_id: int
    symptom_id: int
    onset_date: date

    class Config:
        from_attributes = True

class SymptomDictResponse(BaseModel):
    symptom_id: int
    name: str
    category: Optional[str] = None
    description: Optional[str] = None


    class Config:
        from_attributes = True
