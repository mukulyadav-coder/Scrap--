"""Pydantic schemas for offers."""
from typing import Optional
from pydantic import BaseModel, field_validator


class OfferCreate(BaseModel):
    lot_id: Optional[str] = None
    listing_id: Optional[str] = None
    offer_price: float
    quantity: float
    unit: str = "kg"
    transport_cost_estimate: Optional[float] = None
    valid_until: str  # ISO 8601 datetime string
    note: Optional[str] = None

    @field_validator("offer_price", "quantity")
    @classmethod
    def must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Must be a positive number.")
        return v


class OfferUpdate(BaseModel):
    offer_price: Optional[float] = None
    quantity: Optional[float] = None
    note: Optional[str] = None
    status: Optional[str] = None


class OfferOut(BaseModel):
    id: str
    lot_id: str
    listing_id: str
    buyer_id: str
    offer_price: str
    quantity: str
    unit: str
    transport_cost_estimate: str
    valid_until: str
    status: str
    note: str
    created_at: str
    updated_at: str

