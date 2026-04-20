from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from app.core.auth import decode_access_token
from app.core.config import Settings


def test_decode_access_token_uses_shared_secret_for_hs_alg(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = Settings(
        supabase_jwt_secret="shared-secret",
        supabase_url="https://example.supabase.co",
    )
    decode_mock = Mock(return_value={"sub": "user-1"})
    monkeypatch.setattr("app.core.auth.jwt.get_unverified_header", lambda _: {"alg": "HS256"})
    monkeypatch.setattr("app.core.auth.jwt.decode", decode_mock)

    payload = decode_access_token("token", settings)

    assert payload == {"sub": "user-1"}
    decode_mock.assert_called_once_with(
        "token",
        "shared-secret",
        algorithms=["HS256"],
        issuer="https://example.supabase.co/auth/v1",
        options={"verify_aud": False},
    )


def test_decode_access_token_uses_jwks_for_asymmetric_alg(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = Settings(supabase_url="https://example.supabase.co")
    signing_key = Mock()
    signing_key.key = "public-key"
    jwks_client = Mock()
    jwks_client.get_signing_key_from_jwt.return_value = signing_key
    decode_mock = Mock(return_value={"sub": "user-1"})
    monkeypatch.setattr("app.core.auth.jwt.get_unverified_header", lambda _: {"alg": "ES256"})
    monkeypatch.setattr("app.core.auth.get_jwks_client", lambda _: jwks_client)
    monkeypatch.setattr("app.core.auth.jwt.decode", decode_mock)

    payload = decode_access_token("token", settings)

    assert payload == {"sub": "user-1"}
    jwks_client.get_signing_key_from_jwt.assert_called_once_with("token")
    decode_mock.assert_called_once_with(
        "token",
        "public-key",
        algorithms=["ES256"],
        issuer="https://example.supabase.co/auth/v1",
        options={"verify_aud": False},
    )


def test_decode_access_token_rejects_missing_config_for_asymmetric_alg(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.core.auth.jwt.get_unverified_header", lambda _: {"alg": "ES256"})

    with pytest.raises(HTTPException) as error_info:
        decode_access_token("token", Settings(supabase_url=""))

    assert error_info.value.status_code == 500
    assert error_info.value.detail["code"] == "auth_not_configured"
