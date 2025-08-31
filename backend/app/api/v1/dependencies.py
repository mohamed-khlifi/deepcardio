from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer
from jose import JWTError, jwt
from pydantic import BaseModel
import os

# Auth0 configuration (replace with your Auth0 settings)
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "dev-i263g127pvf7d11w.us.auth0.com")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE", "https://deepcardio-api")
ALGORITHMS = ["RS256"]

# OAuth2 scheme for Auth0
oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl=f"https://{AUTH0_DOMAIN}/authorize",
    tokenUrl=f"https://{AUTH0_DOMAIN}/oauth/token",
    auto_error=True
)

# Pydantic model for user data
class User(BaseModel):
    sub: str
    name: str | None = None
    email: str | None = None

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
        import requests
        jwks = requests.get(jwks_url).json()
        public_key = None
        for key in jwks["keys"]:
            if key["alg"] == "RS256":
                public_key = key
                break
        if not public_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not find public key"
            )
        payload = jwt.decode(
            token,
            public_key,
            algorithms=ALGORITHMS,
            audience=AUTH0_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/"
        )
        return User(**payload)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )