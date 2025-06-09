# backend/schemas/follow_up_action.py

from typing import Optional

from pydantic import BaseModel, Field


class FollowUpActionBase(BaseModel):
    patient_id: int = Field(..., gt=0)
    action: str
    follow_up_interval: Optional[str] = None


class FollowUpActionCreate(FollowUpActionBase):
    pass


class FollowUpActionUpdate(BaseModel):
    action: Optional[str] = None
    follow_up_interval: Optional[str] = None


class FollowUpActionOut(FollowUpActionBase):
    id: int

    class Config:
        from_attributes = True
