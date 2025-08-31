from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class PatientHistoryCreate(BaseModel):
    patient_id: int
    history_id: int
    date_recorded: Optional[date] = None

class PatientHistoryResponse(BaseModel):
    id: int
    patient_id: int
    history_id: int
    date_recorded: Optional[date]
    recorded_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True

class PersonalHistoryDictResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True