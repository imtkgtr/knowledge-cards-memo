from dataclasses import dataclass

import pytest
from fastapi import HTTPException
from postgrest.exceptions import APIError

from app.core.auth import AuthenticatedUser
from app.services.canvas_service import CanvasService


@dataclass
class MissingTableRepository:
    def ensure_profile(self, user_id: str, email: str | None) -> None:
        raise APIError(
            {
                "code": "PGRST205",
                "details": None,
                "hint": None,
                "message": "Could not find the table 'public.profiles' in the schema cache",
            }
        )

    def list_canvases(self, user_id: str):
        raise AssertionError("ensure_profile should fail first")


def test_list_canvases_reports_uninitialized_storage() -> None:
    service = CanvasService(repository=MissingTableRepository())

    with pytest.raises(HTTPException) as error_info:
        service.list_canvases(AuthenticatedUser(id="user-1", email="user@example.com"))

    assert error_info.value.status_code == 500
    assert error_info.value.detail["code"] == "storage_not_initialized"
