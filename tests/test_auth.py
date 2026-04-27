import time
import pytest
from unittest.mock import MagicMock, patch
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
import jwt
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient


def make_rsa_key_pair():
    private_key = rsa.generate_private_key(
        public_exponent=65537, key_size=2048, backend=default_backend()
    )
    return private_key, private_key.public_key()


def make_token(private_key, payload: dict) -> str:
    return jwt.encode(payload, private_key, algorithm="RS256")


def make_signing_key_mock(public_key):
    mock = MagicMock()
    mock.key = public_key
    return mock


@pytest.mark.asyncio
async def test_valid_token_returns_claims():
    from api.services.auth import verify_clerk_token

    private_key, public_key = make_rsa_key_pair()
    token = make_token(private_key, {"sub": "user_abc", "exp": int(time.time()) + 3600})
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    mock_client = MagicMock()
    mock_client.get_signing_key_from_jwt.return_value = make_signing_key_mock(public_key)

    with patch("api.services.auth._get_jwks_client", return_value=mock_client):
        claims = await verify_clerk_token(credentials)

    assert claims["sub"] == "user_abc"


@pytest.mark.asyncio
async def test_expired_token_raises_401():
    from api.services.auth import verify_clerk_token

    private_key, public_key = make_rsa_key_pair()
    token = make_token(private_key, {"sub": "user_abc", "exp": int(time.time()) - 10})
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    mock_client = MagicMock()
    mock_client.get_signing_key_from_jwt.return_value = make_signing_key_mock(public_key)

    with patch("api.services.auth._get_jwks_client", return_value=mock_client):
        with pytest.raises(HTTPException) as exc:
            await verify_clerk_token(credentials)

    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_invalid_token_raises_401():
    from api.services.auth import verify_clerk_token

    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="not.a.token")

    mock_client = MagicMock()
    mock_client.get_signing_key_from_jwt.side_effect = Exception("bad token")

    with patch("api.services.auth._get_jwks_client", return_value=mock_client):
        with pytest.raises(HTTPException) as exc:
            await verify_clerk_token(credentials)

    assert exc.value.status_code == 401


def test_submit_without_token_returns_403():
    import importlib, sys
    # Ensure fresh import
    for key in list(sys.modules.keys()):
        if "api." in key:
            del sys.modules[key]

    from api.main import app
    client = TestClient(app, raise_server_exceptions=False)
    resp = client.post("/submissions", json={
        "problem_id": 1,
        "code": "func:{[x] \"YES\"}",
        "handle": "test"
    })
    assert resp.status_code in (401, 403)  # No bearer header → 401/403 from HTTPBearer (version-dependent)
