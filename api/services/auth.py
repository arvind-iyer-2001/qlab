import os
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient

_jwks_client: PyJWKClient | None = None

bearer = HTTPBearer()


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        url = os.getenv("CLERK_JWKS_URL", "")
        _jwks_client = PyJWKClient(url, cache_keys=True)
    return _jwks_client


async def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    token = credentials.credentials
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return claims
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing token")
