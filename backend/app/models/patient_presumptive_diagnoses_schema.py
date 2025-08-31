# backend/app/models/patient_presumptive_diagnoses_schema.py

from pydantic import BaseModel
from typing import Optional

class PatientPresumptiveDiagnosesBase(BaseModel):
    patient_id: int
    diagnosis_name: str
    confidence_level: Optional[str] = None

class PatientPresumptiveDiagnosesCreate(PatientPresumptiveDiagnosesBase):
    """
    When the client POSTS to /patient-presumptive-diagnoses, they must supply:
      - patient_id (int)
      - diagnosis_name (str)
      - confidence_level (optional str)
    """
    pass

class PatientPresumptiveDiagnosesUpdate(BaseModel):
    """
    When the client PUTs to /patient-presumptive-diagnoses/{diagnosis_id},
    they may update:
      - diagnosis_name (str)
      - confidence_level (str)
      - patient_id (int) - required for catalog item conversions
    """
    diagnosis_name: Optional[str] = None
    confidence_level: Optional[str] = None
    patient_id: Optional[int] = None

class PatientPresumptiveDiagnosesOut(PatientPresumptiveDiagnosesBase):
    """
    What we return on GET /patient-presumptive-diagnoses and PUT /patient-presumptive-diagnoses/{id}:
      - id                 (int)
      - patient_id         (int)
      - diagnosis_name     (str)
      - confidence_level   (str)
      - created_at         (timestamp as string)
      - updated_at         (timestamp as string)
    """
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
