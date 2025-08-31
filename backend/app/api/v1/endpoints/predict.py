import sys
import os
import numpy as np  # Import numpy for type conversion

# Add deepcardio root folder to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..')))

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from core.cardio_model import CardioModel
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(tags=["Predictions"])

# Initialize CardioModel
cardio_model = CardioModel(model_dir="models")
try:
    cardio_model.load_trained_models()
except FileNotFoundError:
    raise Exception("Trained models not found. Run train_model.py first.")

# Define input schema
class PatientInput(BaseModel):
    age: int
    gender: int
    height: float
    weight: float
    ap_hi: float
    ap_lo: float
    cholesterol: int
    gluc: int
    smoke: int
    alco: int
    active: int

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def convert_numpy_types(obj):
    """Recursively convert numpy types to Python types."""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    return obj

@router.post("/predict")
async def predict_cardio(input: PatientInput, token: str = Depends(oauth2_scheme)):
    try:
        # Prepare input for model
        sample_input = [
            input.age * 365,  # Convert years to days
            input.gender,
            input.height * 2.54,  # Convert inches to cm
            input.weight * 0.453592,  # Convert pounds to kg
            input.ap_hi,
            input.ap_lo,
            input.cholesterol,
            input.gluc,
            input.smoke,
            input.alco,
            input.active
        ]
        feature_names = [
            "age", "gender", "height", "weight", "ap_hi", "ap_lo",
            "cholesterol", "gluc", "smoke", "alco", "active"
        ]
        predictions = cardio_model.predict(sample_input, feature_names)
        # Convert numpy types to Python types
        predictions = convert_numpy_types(predictions)
        return {"predictions": predictions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))