from fastapi import APIRouter

from models.health import HealthResponse
from services.health_service import get_status

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check():
    return get_status()
