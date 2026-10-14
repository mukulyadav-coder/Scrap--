"""Pydantic schemas for orders."""
from typing import Optional
from pydantic import BaseModel


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    scheduled_at: Optional[str] = None
    completed_at: Optional[str] = None
    notes: Optional[str] = None


class OrderCompleteRequest(BaseModel):
    actual_weight_kg: float
    payment_status: str = "PAID_DEMO"
    notes: Optional[str] = None


class OrderOut(BaseModel):
    id: str
    offer_id: str
    listing_id: str
    lot_id: str
    seller_id: str
    collector_id: str
    buyer_id: str
    recycler_id: str
    quantity: str
    unit: str
    agreed_price: str
    status: str
    payment_status: str
    scheduled_at: str
    completed_at: str
    notes: str
    created_at: str
    updated_at: str

