from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List

class PatientTestCreate(BaseModel):
    patient_id: int
    test_id: str
    test_date: Optional[date] = None
    result_value: Optional[str] = None
    notes: Optional[str] = None

class PatientTestDelete(BaseModel):
    id: int

class PatientTestUpdate(BaseModel):
    test_record_id: int
    new_result_value: Optional[str] = None
    new_notes: Optional[str] = None
    new_test_date: Optional[date] = None

class PatientTestResponse(BaseModel):
    id: int
    patient_id: int
    test_id: str
    test_date: Optional[date] = None
    result_value: Optional[str] = None
    notes: Optional[str] = None
    recorded_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TestsDictResponse(BaseModel):
    id: str
    name: str
    category: Optional[str] = None
    units: Optional[str] = None

    class Config:
        from_attributes = True