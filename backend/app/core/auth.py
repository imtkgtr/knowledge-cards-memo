from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError, PyJWKClient

from app.core.config import Settings, get_settings

http_bearer = HTTPBearer(auto_error=False)


@dataclass(slots=True)
class AuthenticatedUser:
    id: str
    email: str | None = None


@lru_cache
def get_jwks_client(supabase_url: str) -> PyJWKClient:
    jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(jwks_url)


def decode_access_token(token: str, settings: Settings) -> dict:
    unverified_header = jwt.get_unverified_header(token)
    algorithm = unverified_header.get("alg")
    issuer = f"{settings.supabase_url.rstrip('/')}/auth/v1" if settings.supabase_url else None

    if algorithm and algorithm.startswith("HS"):
        if not settings.supabase_jwt_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "auth_not_configured", "message": "認証設定が不足しています。"},
            )
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=[algorithm],
            issuer=issuer,
            options={"verify_aud": False},
        )

    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "auth_not_configured", "message": "認証設定が不足しています。"},
        )

    signing_key = get_jwks_client(settings.supabase_url).get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=[algorithm] if algorithm else None,
        issuer=issuer,
        options={"verify_aud": False},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthorized", "message": "認証が必要です。"},
        )

    try:
        payload = decode_access_token(credentials.credentials, settings)
    except InvalidTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthorized", "message": "認証トークンが不正です。"},
        ) from error

    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthorized", "message": "認証トークンが不正です。"},
        )

    return AuthenticatedUser(id=user_id, email=email)
