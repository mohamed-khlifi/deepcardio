from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date

# ── tiny “summary” model for search results ──────────────────────────
class PatientBasic(BaseModel):
    id: int
    first_name: str
    last_name: str
    gender: str
    dob: date

    class Config:
        from_attributes = True


# ── existing detailed models (unchanged) ──────────────────────────────
class Symptom(BaseModel):
    id: int
    name: str
    category: Optional[str]

class PersonalHistory(BaseModel):
    id: int
    name: str

class VitalSign(BaseModel):
    id: int
    name: str
    category: Optional[str]
    value: Optional[str]
    unit: Optional[str]

class PatientTest(BaseModel):
    test_id: str
    name: str
    category: Optional[str]
    value: Optional[str]
    unit: Optional[str]
    date: date
    notes: Optional[str]

class FollowUpAction(BaseModel):
    id: int
    interval: str
    action: str

class Recommendation(BaseModel):
    id: int
    recommendation: str

class Referral(BaseModel):
    id: int
    specialist: str
    reason: str

class Risk(BaseModel):
    id: int
    value: str
    reason: str

class LifeStyleAdvice(BaseModel):
    id: int
    advice: str

class PresumptiveDiagnosis(BaseModel):
    id: int
    diagnosis_name: str
    confidence_level: str

class TestToOrder(BaseModel):
    id: int
    test_to_order: str

class Demographics(BaseModel):
    first_name: str
    last_name: str
    gender: str
    date_of_birth: date
    age: int
    ethnicity: Optional[str]

class ContactInfo(BaseModel):
    phone: Optional[str]
    email: Optional[str]

class SocialInfo(BaseModel):
    marital_status: Optional[str]
    occupation: Optional[str]
    insurance_provider: Optional[str]
    address: Optional[str]

class PatientResponse(BaseModel):
    id: int
    demographics: Demographics
    contact_info: ContactInfo
    social_info: SocialInfo
    symptoms: List[Symptom] = []
    personal_history: List[PersonalHistory] = []
    vital_signs: List[VitalSign] = []
    tests: List[PatientTest] = []
    follow_up_actions: List[FollowUpAction] = []
    recommendations: List[Recommendation] = []
    referrals: List[Referral] = []
    risks: List[Risk] = []
    life_style_advice: List[LifeStyleAdvice] = []
    presumptive_diagnoses: List[PresumptiveDiagnosis] = []
    tests_to_order: List[TestToOrder] = []

    class Config:
        from_attributes = True

class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    gender: str
    dob: date
    ethnicity: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    marital_status: Optional[str] = None
    occupation: Optional[str] = None
    insurance_provider: Optional[str] = None
    address: Optional[str] = None
