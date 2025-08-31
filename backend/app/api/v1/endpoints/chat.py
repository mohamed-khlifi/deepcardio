from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
import httpx
import jwt
from auth0.authentication.token_verifier import TokenVerifier, AsymmetricSignatureVerifier
from jwt import PyJWKClient
import os
from dotenv import load_dotenv
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

router = APIRouter()

# OpenAI configuration
OPENAI_KEY = os.getenv("OPENAI_KEY")
OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"
MODEL = "gpt-4o-mini"

# Auth0 configuration
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
AUTH0_CLIENT_ID = os.getenv("AUTH0_CLIENT_ID")

# Log environment variables for debugging (remove in production)
logger.info(f"AUTH0_DOMAIN: {AUTH0_DOMAIN}")
logger.info(f"AUTH0_AUDIENCE: {AUTH0_AUDIENCE}")
logger.info(f"AUTH0_CLIENT_ID: {AUTH0_CLIENT_ID}")

# Verify environment variables
if not AUTH0_CLIENT_ID:
    logger.error("AUTH0_CLIENT_ID is not set")
    raise HTTPException(status_code=500, detail="Server configuration error: AUTH0_CLIENT_ID not set")

# Pydantic model for request body
class ChatRequest(BaseModel):
    patient_id: int
    message: str
    patient_context: dict

# Dependency to verify Auth0 token
async def verify_token(authorization: str = Header(...)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    try:
        token = authorization.split("Bearer ")[1]
        jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
        issuer = f"https://{AUTH0_DOMAIN}/"
        
        # Use PyJWKClient to fetch JWKS and get signing key
        jwks_client = PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token).key
        
        # Decode token to inspect claims
        decoded = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=issuer,
            audience=AUTH0_AUDIENCE,
            options={"verify_aud": True, "verify_iss": True}
        )
        
        # Verify audience explicitly
        aud = decoded.get("aud")
        if isinstance(aud, str):
            aud = [aud]
        if AUTH0_AUDIENCE not in aud:
            raise HTTPException(status_code=401, detail=f"Invalid audience: expected {AUTH0_AUDIENCE}, found {aud}")
        
        # Optional: Verify azp claim (uncomment if required)
        """
        azp = decoded.get("azp")
        if azp and AUTH0_CLIENT_ID and azp != AUTH0_CLIENT_ID:
            raise HTTPException(status_code=401, detail=f"Invalid token: Authorized Party (azp) claim mismatch; expected {AUTH0_CLIENT_ID}, found {azp}")
        """
        
        # Log token claims for debugging
        logger.info(f"Token claims: aud={aud}, azp={decoded.get('azp')}, iss={decoded.get('iss')}")

        # Perform full verification with TokenVerifier
        sv = AsymmetricSignatureVerifier(jwks_url)
        tv = TokenVerifier(signature_verifier=sv, issuer=issuer, audience=AUTH0_AUDIENCE)
        tv.verify(token)
        return token
    except IndexError:
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail=f"Invalid audience in token")
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

@router.post("/chat")
async def chat(request: ChatRequest, token: str = Depends(verify_token)):
    if not OPENAI_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                OPENAI_ENDPOINT,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENAI_KEY}",
                },
                json={
                    "model": MODEL,
                    "temperature": 0,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are DeepCardio Copilot, an AI assistant for cardiology consultations. "
                                "Provide concise, professional responses based on the patient context and message. "
                                "Focus on cardiovascular health and avoid providing non-medical advice."
                            ),
                        },
                        {
                            "role": "user",
                            "content": (
                                f"Patient ID: {request.patient_id}\n"
                                f"Patient Context: {request.patient_context}\n"
                                f"Message: {request.message}"
                            ),
                        },
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()
            return {"response": data["choices"][0]["message"]["content"]}
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=500, detail=f"OpenAI error: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")