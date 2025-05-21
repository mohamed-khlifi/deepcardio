from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from fastapi import Request, HTTPException

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "super-secret-key"  # Replace with env var in production
ALGORITHM = "HS256"
TOKEN_EXPIRY_MINUTES = 60 * 24  # 1 day

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str):
    return pwd_context.verify(plain, hashed)

def generate_verification_token(email: str):
    expire = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRY_MINUTES)
    return jwt.encode({"sub": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])["sub"]

def generate_access_token(doctor_id: int):
    expire = datetime.utcnow() + timedelta(minutes=60 * 24)
    to_encode = {"sub": str(doctor_id), "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_doctor(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
