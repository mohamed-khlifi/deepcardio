# utils/auth.py

from jose import jwt
from jose.exceptions import JWTError
from fastapi import HTTPException, Request, status
from urllib.request import urlopen
import json

AUTH0_DOMAIN = "dev-i263g127pvf7d11w.us.auth0.com"
API_AUDIENCE = "https://deepcardio-api"
ALGORITHMS = ["RS256"]

# Automatically get the Auth0 public keys
def get_jwks():
    jsonurl = urlopen(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json")
    return json.loads(jsonurl.read())

def get_token_auth_header(request: Request):
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return auth.split(" ")[1]

def verify_jwt(token: str):
    jwks = get_jwks()
    unverified_header = jwt.get_unverified_header(token)
    rsa_key = {}

    for key in jwks["keys"]:
        if key["kid"] == unverified_header["kid"]:
            rsa_key = {
                "kty": key["kty"],
                "kid": key["kid"],
                "use": key["use"],
                "n": key["n"],
                "e": key["e"]
            }

    if not rsa_key:
        raise HTTPException(status_code=401, detail="RSA key not found")

    try:
        payload = jwt.decode(token, rsa_key, algorithms=ALGORITHMS, audience=API_AUDIENCE, issuer=f"https://{AUTH0_DOMAIN}/")
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail="Token is invalid or expired")
