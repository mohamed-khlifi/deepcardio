from pydantic import BaseModel, EmailStr
from typing import Optional

class DoctorCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    username: str
    password: str

class DoctorOut(BaseModel):
    id: int  #
    first_name: str
    last_name: str
    email: EmailStr
    username: str
    is_verified: bool

    class Config:
        from_attributes = True
