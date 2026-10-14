"""Authentication routes for the ScrapSetu web client."""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status

from app.config import settings
from app.schemas.auth import (
    AccessTokenResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    UserOut,
)
from app.security.dependencies import check_login_rate_limit, get_current_user
from app.services.auth_service import (
    AuthenticationError,
    RegistrationError,
    login_user,
    refresh_access_token,
    register_user,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])
_REFRESH_COOKIE = "scrapsetu_refresh"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=settings.APP_ENV.lower() == "production",
        samesite="strict",
        path="/api/auth",
    )


def _token_response(token_pair: Dict[str, Any], response: Response) -> AccessTokenResponse:
    _set_refresh_cookie(response, token_pair["refresh_token"])
    return AccessTokenResponse(
        access_token=token_pair["access_token"],
        token_type=token_pair["token_type"],
        user_id=token_pair["user_id"],
        role=token_pair["role"],
        full_name=token_pair["full_name"],
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> Dict[str, Any]:
    try:
        return register_user(payload.model_dump())
    except RegistrationError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post(
    "/login",
    response_model=AccessTokenResponse,
    dependencies=[Depends(check_login_rate_limit)],
)
def login(payload: LoginRequest, response: Response) -> AccessTokenResponse:
    try:
        tokens = login_user(payload.email, payload.password)
    except AuthenticationError as exc:
        code = status.HTTP_403_FORBIDDEN if "suspended" in str(exc).lower() else status.HTTP_401_UNAUTHORIZED
        raise HTTPException(status_code=code, detail=str(exc)) from exc
    return _token_response(tokens, response)


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(
    response: Response,
    payload: Optional[RefreshRequest] = None,
    cookie_token: Optional[str] = Cookie(default=None, alias=_REFRESH_COOKIE),
) -> AccessTokenResponse:
    token = payload.refresh_token if payload and payload.refresh_token else cookie_token
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required.")

    tokens = refresh_access_token(token)
    if not tokens:
        response.delete_cookie(_REFRESH_COOKIE, path="/api/auth", samesite="strict")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is invalid or expired.")
    return _token_response(tokens, response)


@router.get("/me", response_model=UserOut)
def me(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> Response:
    response.delete_cookie(
        key=_REFRESH_COOKIE,
        path="/api/auth",
        httponly=True,
        secure=settings.APP_ENV.lower() == "production",
        samesite="strict",
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
