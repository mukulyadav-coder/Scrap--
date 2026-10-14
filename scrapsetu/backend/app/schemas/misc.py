"""Pydantic schemas for handover records and support tickets."""
from typing import Optional
from pydantic import BaseModel


class HandoverCreate(BaseModel):
    order_id: str
    received_by: str
    quantity: float
    weight_kg: float
    condition: str
    evidence_paths: Optional[str] = None  # JSON array string
    notes: Optional[str] = None


class HandoverConfirm(BaseModel):
    order_id: str
    confirmed: bool = True
    notes: Optional[str] = None


class SupportTicketCreate(BaseModel):
    order_id: Optional[str] = None
    category: str
    subject: str
    description: str


class NotificationOut(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    related_entity_type: str
    related_entity_id: str
    read_at: str
    created_at: str

