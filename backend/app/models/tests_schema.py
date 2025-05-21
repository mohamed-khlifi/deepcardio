from pydantic import BaseModel
from datetime import date
from typing import Optional

class PatientTestCreate(BaseModel):
    patient_id: int
    test_id: str
    test_date: date
    result_value: Optional[str] = None
    notes: Optional[str] = None

class PatientTestDelete(BaseModel):
    patient_id: int
    test_id: str

class PatientTestUpdate(BaseModel):
    patient_id: int
    test_id: str
    new_result_value: Optional[str] = None
    new_notes: Optional[str] = None

class TestsDictResponse(BaseModel):
    id: str
    name: str
    category: Optional[str] = None
    units: Optional[str] = None

    class Config:
        from_attributes = True