from sqlalchemy import Column, Integer, String, DateTime, JSON
from backend.app.core.config import Base
from datetime import datetime, timezone

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, nullable=False)
    doctor_id = Column(Integer, nullable=False)
    action_type = Column(String(50), nullable=False)  # Increased length to accommodate longer action types
    entity_type = Column(String(50), nullable=False)
    action_details = Column(JSON, nullable=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    @staticmethod
    def log_event(db, doctor_id: int, action_type: str, entity_type: str, patient_id: int, description: str, action_details: dict = None):
        """Log an audit event to the database"""
        try:
            audit_log = AuditLog(
                doctor_id=doctor_id,
                action_type=action_type,
                entity_type=entity_type,
                patient_id=patient_id,
                description=description,
                action_details=action_details
            )
            db.add(audit_log)
            db.commit()
            return audit_log
        except Exception as e:
            db.rollback()
            print(f"Error logging audit event: {str(e)}")
            # Don't fail the main operation if audit logging fails
            return None