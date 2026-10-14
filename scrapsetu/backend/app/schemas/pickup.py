"""Pydantic schemas for pickup requests."""
from typing import Optional
from pydantic import BaseModel


class PickupCreate(BaseModel):
    listing_id: str
    pickup_address: str
    scheduled_at: str  # ISO 8601


class PickupUpdate(BaseModel):
    collector_id: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: Optional[str] = None
    actual_weight_kg: Optional[float] = None
    collection_notes: Optional[str] = None
    evidence_paths: Optional[str] = None  # JSON array string


class PickupOut(BaseModel):
    id: str
    listing_id: str
    seller_id: str
    collector_id: str
    pickup_address: str
    scheduled_at: str
    status: str
    actual_weight_kg: str
    collection_notes: str
    evidence_paths: str
    created_at: str
    updated_at: str

