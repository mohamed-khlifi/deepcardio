# backend/app/models/follow_up_action_schema.py

from pydantic import BaseModel
from typing import Optional

class FollowUpActionBase(BaseModel):
    patient_id: int
    action: str
    follow_up_interval: Optional[str] = None


class FollowUpActionCreate(FollowUpActionBase):
    """
    When the client POSTS to /follow-up-actions, they must supply:
      - patient_id (int)
      - action (str)
      - follow_up_interval (optional)
    """
    pass


class FollowUpActionUpdate(BaseModel):
    """
    When the client PUTs to /follow-up-actions/{action_id},
    they may update one or both of:
      - action (str)
      - follow_up_interval (str)
    """
    action: Optional[str] = None
    follow_up_interval: Optional[str] = None


class FollowUpActionOut(FollowUpActionBase):
    """
    What we return on GET /follow-up-actions and PUT /follow-up-actions/{id}:
      - id                 (int)
      - patient_id         (int)
      - action             (str)
      - follow_up_interval (str)
      - created_at         (timestamp as string)
      - updated_at         (timestamp as string)
    """
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
