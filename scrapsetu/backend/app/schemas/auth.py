"""Pydantic schemas for authentication endpoints."""
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
import re

ALLOWED_SELF_REGISTER_ROLES = {"SELLER", "COLLECTOR", "BUYER", "RECYCLER"}


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    phone: str
    password: str
    role: str
    seller_type: Optional[str] = None
    business_name: Optional[str] = None
    city: str
    locality: Optional[str] = None
    preferred_language: str = "en"

    @field_validator("role")
    @classmethod
    def role_must_not_be_admin(cls, v: str) -> str:
        normalized = v.upper()
        if normalized not in ALLOWED_SELF_REGISTER_ROLES:
            raise ValueError(
                f"Role '{v}' is not allowed for self-registration. "
                f"Allowed roles: {sorted(ALLOWED_SELF_REGISTER_ROLES)}"
            )
        return normalized

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be no more than 72 UTF-8 bytes.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit.")
        return v

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("phone")
    @classmethod
    def phone_format(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^\+?[0-9]{10,15}$", cleaned):
            raise ValueError("Phone must be 10-15 digits, optionally starting with +.")
        return cleaned


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("password")
    @classmethod
    def password_within_bcrypt_limit(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be no more than 72 UTF-8 bytes.")
        return v

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.strip().lower()


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    full_name: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    full_name: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str
    role: str
    account_status: str
    verification_status: str
    seller_type: Optional[str] = None
    business_name: Optional[str] = None
    city: str
    locality: Optional[str] = None
    preferred_language: str
    green_score_kg: str = "0"
    completed_transactions: str = "0"
    created_at: str
    updated_at: str
