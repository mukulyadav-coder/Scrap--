"""Pydantic schemas for listings."""
from typing import List, Optional
from pydantic import BaseModel, field_validator


class ListingCreate(BaseModel):
    title: str
    material_category: str
    subcategory: str
    description: str
    condition: str
    quantity: float
    unit: str
    estimated_weight_kg: float
    price_expectation: Optional[float] = None
    image_paths: Optional[List[str]] = None
    pickup_address: str
    city: str
    locality: Optional[str] = None
    is_ewaste: bool = False
    ewaste_compliance_accepted: bool = False
    notes: Optional[str] = None

    @field_validator("material_category")
    @classmethod
    def valid_category(cls, v: str) -> str:
        allowed = {"paper", "cardboard", "plastic", "metal", "e_waste", "other"}
        if v.lower() not in allowed:
            raise ValueError(f"material_category must be one of {allowed}")
        return v.lower()

    @field_validator("condition")
    @classmethod
    def valid_condition(cls, v: str) -> str:
        allowed = {"clean_sorted", "mixed", "unsegregated"}
        if v.lower() not in allowed:
            raise ValueError(f"condition must be one of {allowed}")
        return v.lower()


class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    condition: Optional[str] = None
    quantity: Optional[float] = None
    estimated_weight_kg: Optional[float] = None
    price_expectation: Optional[float] = None
    image_paths: Optional[List[str]] = None
    pickup_address: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class ListingOut(BaseModel):
    id: str
    seller_id: str
    title: str
    material_category: str
    subcategory: str
    description: str
    condition: str
    quantity: str
    unit: str
    estimated_weight_kg: str
    price_expectation: str
    image_paths: str
    pickup_address: str
    city: str
    locality: str
    status: str
    is_ewaste: str
    ewaste_compliance_accepted: str
    notes: str
    created_at: str
    updated_at: str

