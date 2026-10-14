"""Pydantic schemas for inventory lots."""
from typing import Optional
from pydantic import BaseModel, field_validator


class InventoryLotCreate(BaseModel):
    source_listing_id: Optional[str] = None
    source_pickup_id: Optional[str] = None
    material_category: str
    subcategory: str
    quantity: float
    unit: str = "kg"
    weight_kg: float
    condition: str
    asking_price: float
    city: str
    notes: Optional[str] = None

    @field_validator("asking_price", "quantity", "weight_kg")
    @classmethod
    def must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Must be a positive number.")
        return v


class InventoryLotUpdate(BaseModel):
    quantity: Optional[float] = None
    weight_kg: Optional[float] = None
    asking_price: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class InventoryLotOut(BaseModel):
    id: str
    collector_id: str
    source_listing_id: str
    source_pickup_id: str
    material_category: str
    subcategory: str
    quantity: str
    unit: str
    weight_kg: str
    condition: str
    asking_price: str
    city: str
    status: str
    notes: str
    created_at: str
    updated_at: str

