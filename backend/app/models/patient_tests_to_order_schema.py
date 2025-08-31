# backend/app/models/patient_tests_to_order_schema.py

from pydantic import BaseModel
from typing import Optional

class PatientTestsToOrderBase(BaseModel):
    patient_id: int
    test_to_order: str

class PatientTestsToOrderCreate(PatientTestsToOrderBase):
    """
    When the client POSTS to /patient-tests-to-order, they must supply:
      - patient_id (int)
      - test_to_order (str)
    """
    pass

class PatientTestsToOrderUpdate(BaseModel):
    """
    When the client PUTs to /patient-tests-to-order/{test_order_id},
    they may update:
      - test_to_order (str)
      - patient_id (int) - required for catalog item conversions
    """
    test_to_order: Optional[str] = None
    patient_id: Optional[int] = None

class PatientTestsToOrderOut(PatientTestsToOrderBase):
    """
    What we return on GET /patient-tests-to-order and PUT /patient-tests-to-order/{id}:
      - id                 (int)
      - patient_id         (int)
      - test_to_order      (str)
      - created_at         (timestamp as string)
      - updated_at         (timestamp as string)
    """
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
