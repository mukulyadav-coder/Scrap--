"""
FastAPI dependency injection for authentication and authorization.

Includes:
- get_current_user: Extracts and validates JWT from Authorization header
- require_role: Enforces role-based access control
- Simple in-memory rate limiter for login endpoint
"""
import time
from collections import defaultdict
from typing import Any, Dict, List

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.security.jwt_handler import decode_token
from app.storage.storage_factory import get_repository

_bearer = HTTPBearer(auto_error=False)

# Simple in-memory rate limiter: {ip: [(timestamp), ...]}
_login_attempts: Dict[str, List[float]] = defaultdict(list)
_LOGIN_WINDOW = 60  # seconds
_LOGIN_MAX = 5  # max attempts per window


def check_login_rate_limit(request: Request) -> None:
    """
    Rate limit login attempts to 5 per IP per minute.
    Raises HTTP 429 if exceeded.
    """
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - _LOGIN_WINDOW

    # Prune old attempts
    _login_attempts[ip] = [t for t in _login_attempts[ip] if t > window_start]

    if len(_login_attempts[ip]) >= _LOGIN_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Please wait {_LOGIN_WINDOW} seconds.",
        )
    _login_attempts[ip].append(now)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> Dict[str, Any]:
    """
    Extract the current user from the JWT Bearer token.

    Raises HTTP 401 if token is missing, invalid, or expired.
    Raises HTTP 403 if account is suspended.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub", "")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )

    users_repo = get_repository("users")
    user = users_repo.find_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
        )

    if user.get("account_status") == "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Contact support.",
        )

    return user


def require_role(roles: List[str]):
    """
    Dependency factory that enforces role-based access.

    Usage:
        @router.get("/admin/users", dependencies=[Depends(require_role(["ADMIN"]))])

    Raises HTTP 403 if the current user's role is not in the allowed list.
    """
    async def _check(current_user: Dict[str, Any] = Depends(get_current_user)):
        user_role = current_user.get("role", "")
        if user_role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {roles}. Your role: {user_role}",
            )
        return current_user
    return _check


def get_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Shortcut dependency for ADMIN-only endpoints."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint requires administrator access.",
        )
    return current_user

