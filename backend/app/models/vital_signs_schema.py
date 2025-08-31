from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List

class PatientVitalSignCreate(BaseModel):
    patient_id: int
    vital_sign_id: int
    measurement_date: Optional[date] = None
    value: str

class PatientVitalSignUpdate(BaseModel):
    vital_sign_record_id: int
    new_value: Optional[str] = None
    new_measurement_date: Optional[date] = None

class PatientVitalSignDelete(BaseModel):
    id: int

class PatientVitalSignResponse(BaseModel):
    id: int
    patient_id: int
    vital_sign_id: int
    measurement_date: Optional[date] = None
    value: Optional[str] = None
    recorded_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class VitalSignDictResponse(BaseModel):
    vital_sign_id: int
    name: str
    category: Optional[str] = None
    unit: Optional[str] = None

    class Config:
        from_attributes = True