from pydantic import BaseModel
from datetime import date

class PatientPersonalHistoryCreate(BaseModel):
    patient_id: int
    history_id: int
    date_recorded: date

class PatientPersonalHistoryResponse(BaseModel):
    patient_id: int
    history_id: int
    date_recorded: date

    class Config:
        from_attributes = True

class PersonalHistoryDictResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True
