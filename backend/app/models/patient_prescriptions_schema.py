from pydantic import BaseModel
from typing import Optional


class PatientPrescriptionsBase(BaseModel):
    patient_id: int
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None


class PatientPrescriptionsCreate(PatientPrescriptionsBase):
    """
    What the client POSTs to /patient-prescriptions:
      - patient_id         (int)
      - medicine_name      (str)
      - dosage             (str)
      - frequency          (str)
      - duration           (str)
      - instructions       (str, optional)
    """
    pass


class PatientPrescriptionsUpdate(BaseModel):
    """
    When the client PUTs to /patient-prescriptions/{prescription_id},
    they may update:
      - medicine_name      (str)
      - dosage             (str)
      - frequency          (str)
      - duration           (str)
      - instructions       (str)
    """
    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None


class PatientPrescriptionsOut(PatientPrescriptionsBase):
    """
    What we return on GET /patient-prescriptions and PUT /patient-prescriptions/{id}:
      - id                 (int)
      - patient_id         (int)
      - medicine_name      (str)
      - dosage             (str)
      - frequency          (str)
      - duration           (str)
      - instructions       (str)
      - created_at         (timestamp as string)
      - updated_at         (timestamp as string)
    """
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
