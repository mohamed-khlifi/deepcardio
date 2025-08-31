from fastapi import APIRouter

from backend.app.models.health import HealthResponse
from backend.app.services.health_service import get_status

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check():
    return get_status()
