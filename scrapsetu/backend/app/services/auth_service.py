"""
Authentication service: registration, login, token refresh.

Security guarantees:
- Passwords are hashed with bcrypt before storage
- Plaintext passwords are never written to CSV, logs, or exports
- ADMIN role cannot be self-registered (enforced in schema + here)
- Duplicate email/phone checked before creating user
"""
import logging
from typing import Any, Dict, Optional

from app.security.jwt_handler import create_access_token, create_refresh_token, decode_token
from app.security.password import hash_password, verify_password
from app.storage.storage_factory import get_repository

logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    """Raised for login failures (intentionally vague to prevent user enumeration)."""


class RegistrationError(Exception):
    """Raised when registration cannot proceed."""


def register_user(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Register a new user.

    Returns the created user record (without password_hash).
    Raises RegistrationError for duplicate email/phone or blocked roles.
    """
    users_repo = get_repository("users")

    # Block ADMIN self-registration (defence-in-depth; also blocked in schema)
    role = data.get("role", "").upper()
    if role == "ADMIN":
        raise RegistrationError("ADMIN accounts cannot be self-registered.")

    email = data.get("email", "").lower().strip()
    phone = data.get("phone", "").strip()

    # Uniqueness checks
    if users_repo.exists({"email": email}):
        raise RegistrationError("An account with this email already exists.")
    if phone and users_repo.exists({"phone": phone}):
        raise RegistrationError("An account with this phone number already exists.")

    plain_password = data.get("password", "")
    password_hash = hash_password(plain_password)

    record = {
        "full_name":              data.get("full_name", ""),
        "email":                  email,
        "phone":                  phone,
        "password_hash":          password_hash,
        "role":                   role,
        "account_status":         "ACTIVE",
        "verification_status":    "UNVERIFIED",
        "seller_type":            data.get("seller_type", ""),
        "business_name":          data.get("business_name", ""),
        "city":                   data.get("city", ""),
        "locality":               data.get("locality", ""),
        "preferred_language":     data.get("preferred_language", "en"),
        "green_score_kg":         "0",
        "completed_transactions": "0",
    }

    created = users_repo.create(record)
    # Never return password_hash
    created.pop("password_hash", None)
    logger.info(f"Registered user id={created['id']} role={role}")
    return created


def login_user(email: str, password: str) -> Dict[str, Any]:
    """
    Authenticate a user and return JWT tokens.

    Raises AuthenticationError for any failure (vague by design).
    """
    users_repo = get_repository("users")
    email = email.lower().strip()

    user = users_repo.find_one({"email": email})
    if not user:
        # Intentionally vague
        raise AuthenticationError("Invalid email or password.")

    if not verify_password(password, user.get("password_hash", "")):
        raise AuthenticationError("Invalid email or password.")

    if user.get("account_status") == "SUSPENDED":
        raise AuthenticationError("Account suspended. Contact support.")

    token_data = {"sub": user["id"], "role": user["role"]}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    logger.info(f"User logged in id={user['id']} role={user['role']}")
    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "user_id":       user["id"],
        "role":          user["role"],
        "full_name":     user["full_name"],
    }


def refresh_access_token(refresh_token: str) -> Optional[Dict[str, Any]]:
    """
    Validate a refresh token and issue a new access token.

    Returns new token pair, or None if refresh token is invalid/expired.
    """
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        return None

    user_id = payload.get("sub", "")
    users_repo = get_repository("users")
    user = users_repo.find_by_id(user_id)
    if not user or user.get("account_status") == "SUSPENDED":
        return None

    token_data = {"sub": user["id"], "role": user["role"]}
    return {
        "access_token":  create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type":    "bearer",
        "user_id":       user["id"],
        "role":          user["role"],
        "full_name":     user["full_name"],
    }


def seed_admin_user(email: str, password: str) -> None:
    """
    Seed the initial ADMIN user if no admin exists yet.
    Called at application startup. Safe to call multiple times.
    """
    users_repo = get_repository("users")
    if users_repo.exists({"role": "ADMIN"}):
        return  # Admin already seeded

    record = {
        "full_name":              "ScrapSetu Admin",
        "email":                  email.lower(),
        "phone":                  "+910000000000",
        "password_hash":          hash_password(password),
        "role":                   "ADMIN",
        "account_status":         "ACTIVE",
        "verification_status":    "VERIFIED",
        "seller_type":            "",
        "business_name":          "ScrapSetu Platform Operations",
        "city":                   "New Delhi",
        "locality":               "Central Operations",
        "preferred_language":     "en",
        "green_score_kg":         "0",
        "completed_transactions": "0",
    }
    users_repo.create(record)
    logger.info(f"Admin user seeded: {email}")

