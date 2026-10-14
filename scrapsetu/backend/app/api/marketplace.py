"""Authenticated marketplace endpoints backed by the configured repository."""
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.security.dependencies import get_current_user, require_role
from app.storage.storage_factory import get_repository
from app.validators.status_transitions import validate_status_transition

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["marketplace"])


def _repo(name: str):
    return get_repository(name)


def _user_role(user: Dict[str, Any]) -> str:
    return str(user.get("role", "")).upper()


def _record_or_404(entity: str, record_id: str) -> Dict[str, Any]:
    record = _repo(entity).find_by_id(record_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{entity.rstrip('s').title()} not found.")
    return record


def _notify(user_id: str, title: str, message: str, entity_type: str, entity_id: str) -> None:
    _repo("notifications").create({
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": "info",
        "related_entity_type": entity_type,
        "related_entity_id": entity_id,
        "read_at": "",
    })


def _audit(user: Dict[str, Any], action: str, entity_type: str, entity_id: str, outcome: str = "success") -> None:
    _repo("audit_log").create({
        "actor_id": user["id"],
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "outcome": outcome,
        "details": "",
    })


def _listing_out(listing: Dict[str, Any]) -> Dict[str, Any]:
    seller = _repo("users").find_by_id(listing.get("seller_id", "")) or {}
    try:
        images = json.loads(listing.get("image_paths") or "[]")
    except (json.JSONDecodeError, TypeError):
        images = []
    offers = _repo("offers").find_all({"listing_id": listing["id"]}, page_size=1000)
    return {
        **listing,
        "seller_name": seller.get("full_name", ""),
        "seller_phone": seller.get("phone", ""),
        "photos": images,
        "estimated_weight_kg": float(listing.get("estimated_weight_kg") or 0),
        "offers_count": len(offers),
        "is_ewaste": str(listing.get("is_ewaste", "")).lower() == "true",
        "ewaste_compliance_accepted": str(listing.get("ewaste_compliance_accepted", "")).lower() == "true",
        "status": str(listing.get("status", "")).lower(),
    }


def _offer_out(offer: Dict[str, Any]) -> Dict[str, Any]:
    buyer = _repo("users").find_by_id(offer.get("buyer_id", "")) or {}
    listing = _repo("listings").find_by_id(offer.get("listing_id", "")) or {}
    rate = float(offer.get("offer_price") or 0)
    weight = float(offer.get("quantity") or listing.get("estimated_weight_kg") or 0)
    return {
        **offer,
        "buyer_name": buyer.get("business_name") or buyer.get("full_name", ""),
        "buyer_role": str(buyer.get("role", "")).lower(),
        "buyer_rating": 0,
        "buyer_distance_km": 0,
        "offered_rate_per_kg": rate,
        "total_estimated_amount": round(rate * weight),
        "proposed_pickup_time": offer.get("valid_until", ""),
        "status": str(offer.get("status", "")).lower(),
        "created_at": offer.get("created_at", ""),
    }


def _order_out(order: Dict[str, Any]) -> Dict[str, Any]:
    listing = _repo("listings").find_by_id(order.get("listing_id", "")) or {}
    seller = _repo("users").find_by_id(order.get("seller_id", "")) or {}
    collector_id = order.get("collector_id") or order.get("buyer_id") or order.get("recycler_id", "")
    collector = _repo("users").find_by_id(collector_id) or {}
    rate = float(order.get("agreed_price") or 0)
    weight = float(order.get("quantity") or 0)
    completed = str(order.get("status", "")).upper() == "COMPLETED"
    return {
        **order,
        "seller_name": seller.get("full_name", ""),
        "seller_phone": seller.get("phone", ""),
        "seller_address": listing.get("pickup_address", ""),
        "buyer_id": collector_id,
        "buyer_name": collector.get("business_name") or collector.get("full_name", ""),
        "buyer_phone": collector.get("phone", ""),
        "category": listing.get("material_category", ""),
        "subcategory": listing.get("subcategory", ""),
        "agreed_rate_per_kg": rate,
        "actual_weight_kg": weight if completed else None,
        "final_amount": round(rate * weight, 2) if completed else None,
        "payment_status": str(order.get("payment_status", "pending")).lower(),
        "scheduled_slot": order.get("scheduled_at", ""),
        "scheduled_date": (order.get("scheduled_at") or "")[:10],
        "receipt_number": order.get("id", ""),
        "status": str(order.get("status", "")).lower(),
        "created_at": order.get("created_at", ""),
    }


def _has_role(user: Dict[str, Any], *roles: str) -> bool:
    return _user_role(user) in roles


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    phone: Optional[str] = Field(default=None, min_length=10, max_length=20)
    city: Optional[str] = Field(default=None, min_length=1, max_length=100)
    locality: Optional[str] = Field(default=None, max_length=120)
    business_name: Optional[str] = Field(default=None, max_length=160)
    preferred_language: Optional[str] = Field(default=None, pattern="^(en|hi)$")


class ListingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    material_category: str
    subcategory: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=3000)
    condition: str
    quantity: float = Field(gt=0)
    unit: str = Field(default="kg", max_length=20)
    estimated_weight_kg: float = Field(gt=0)
    price_expectation: Optional[float] = Field(default=None, ge=0)
    image_paths: List[str] = Field(default_factory=list, max_length=8)
    pickup_address: str = Field(min_length=1, max_length=500)
    city: str = Field(min_length=1, max_length=100)
    locality: Optional[str] = Field(default=None, max_length=120)
    is_ewaste: bool = False
    ewaste_compliance_accepted: bool = False
    notes: Optional[str] = Field(default=None, max_length=2000)
    preferred_slot: Optional[str] = Field(default=None, max_length=120)


class ListingUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=160)
    description: Optional[str] = Field(default=None, max_length=3000)
    condition: Optional[str] = None
    quantity: Optional[float] = Field(default=None, gt=0)
    estimated_weight_kg: Optional[float] = Field(default=None, gt=0)
    price_expectation: Optional[float] = Field(default=None, ge=0)
    image_paths: Optional[List[str]] = Field(default=None, max_length=8)
    pickup_address: Optional[str] = Field(default=None, min_length=1, max_length=500)
    locality: Optional[str] = Field(default=None, max_length=120)
    notes: Optional[str] = Field(default=None, max_length=2000)
    preferred_slot: Optional[str] = Field(default=None, max_length=120)
    status: Optional[str] = None


class OfferCreate(BaseModel):
    listing_id: str
    offered_rate_per_kg: float = Field(gt=0)
    proposed_pickup_time: str = Field(min_length=1, max_length=120)
    note: Optional[str] = Field(default=None, max_length=1000)


class SettleOrder(BaseModel):
    actual_weight_kg: float = Field(gt=0)
    payment_status: str = Field(pattern="^(paid_cash_demo|paid_upi_demo)$")
    transaction_notes: Optional[str] = Field(default=None, max_length=1000)


class BulkRequirementCreate(BaseModel):
    category: str
    subcategory: str = Field(min_length=1, max_length=100)
    min_quantity_kg: float = Field(gt=0)
    offered_rate_per_kg: float = Field(gt=0)
    purity_grade: str = Field(min_length=1, max_length=100)
    locality: str = Field(min_length=1, max_length=160)
    valid_till: str = Field(min_length=1, max_length=40)
    notes: Optional[str] = Field(default=None, max_length=1000)


@router.get("/users/me")
def get_profile(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    user.pop("password_hash", None)
    return user


@router.patch("/users/me")
def update_profile(
    payload: ProfileUpdate,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    changes = payload.model_dump(exclude_unset=True)
    if "phone" in changes and _repo("users").exists({"phone": changes["phone"]}):
        other = _repo("users").find_one({"phone": changes["phone"]})
        if other and other["id"] != user["id"]:
            raise HTTPException(status_code=409, detail="An account with this phone number already exists.")
    updated = _repo("users").update(user["id"], changes)
    if updated is None:
        raise HTTPException(status_code=404, detail="User account not found.")
    updated.pop("password_hash", None)
    _audit(user, "profile.update", "user", user["id"])
    return updated


@router.get("/listings")
def list_listings(
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    mine: bool = False,
    user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    filters: Dict[str, Any] = {}
    if category and category.lower() != "all":
        filters["material_category"] = category.lower()
    if status_filter and status_filter.lower() != "all":
        filters["status"] = status_filter.upper()
    if mine:
        filters["seller_id"] = user["id"]
    elif _user_role(user) != "ADMIN":
        filters["status"] = status_filter.upper() if status_filter else "ACTIVE"
    return [_listing_out(item) for item in _repo("listings").find_all(filters, page_size=1000)]


@router.post("/listings", status_code=status.HTTP_201_CREATED)
def create_listing(
    payload: ListingCreate,
    user: Dict[str, Any] = Depends(require_role(["SELLER"])),
) -> Dict[str, Any]:
    if payload.is_ewaste and not payload.ewaste_compliance_accepted:
        raise HTTPException(status_code=422, detail="E-waste compliance acknowledgement is required.")
    now = datetime.now(timezone.utc).isoformat()
    listing = _repo("listings").create({
        "seller_id": user["id"],
        "title": payload.title,
        "material_category": payload.material_category.lower(),
        "subcategory": payload.subcategory,
        "description": payload.description,
        "condition": payload.condition.lower(),
        "quantity": str(payload.quantity),
        "unit": payload.unit,
        "estimated_weight_kg": str(payload.estimated_weight_kg),
        "price_expectation": str(payload.price_expectation or ""),
        "image_paths": json.dumps(payload.image_paths),
        "pickup_address": payload.pickup_address,
        "city": payload.city,
        "locality": payload.locality or user.get("locality", ""),
        "status": "ACTIVE",
        "is_ewaste": str(payload.is_ewaste).lower(),
        "ewaste_compliance_accepted": str(payload.ewaste_compliance_accepted).lower(),
        "notes": payload.notes or "",
        "created_at": now,
        "updated_at": now,
    })
    _audit(user, "listing.create", "listing", listing["id"])
    return _listing_out(listing)


@router.patch("/listings/{listing_id}")
def update_listing(
    listing_id: str,
    payload: ListingUpdate,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    listing = _record_or_404("listings", listing_id)
    if listing["seller_id"] != user["id"] and _user_role(user) != "ADMIN":
        raise HTTPException(status_code=403, detail="You may only update your own listings.")
    changes = payload.model_dump(exclude_unset=True)
    if "status" in changes:
        try:
            validate_status_transition("listing", listing["status"], changes["status"])
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        changes["status"] = changes["status"].upper()
    if "image_paths" in changes:
        changes["image_paths"] = json.dumps(changes["image_paths"])
    if "quantity" in changes:
        changes["quantity"] = str(changes["quantity"])
    if "estimated_weight_kg" in changes:
        changes["estimated_weight_kg"] = str(changes["estimated_weight_kg"])
    updated = _repo("listings").update(listing_id, changes)
    assert updated is not None
    _audit(user, "listing.update", "listing", listing_id)
    return _listing_out(updated)


@router.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(listing_id: str, user: Dict[str, Any] = Depends(get_current_user)) -> None:
    listing = _record_or_404("listings", listing_id)
    if listing["seller_id"] != user["id"] and _user_role(user) != "ADMIN":
        raise HTTPException(status_code=403, detail="You may only delete your own listings.")
    if listing["status"] != "ACTIVE":
        raise HTTPException(status_code=409, detail="Only active listings can be deleted.")
    if not _repo("listings").delete(listing_id):
        raise HTTPException(status_code=404, detail="Listing not found.")
    _audit(user, "listing.delete", "listing", listing_id)


@router.get("/offers")
def list_offers(
    listing_id: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    results = _repo("offers").find_all({"listing_id": listing_id}, page_size=1000) if listing_id else _repo("offers").find_all(page_size=1000)
    if _user_role(user) != "ADMIN":
        my_listing_ids = {
            row["id"] for row in _repo("listings").find_all({"seller_id": user["id"]}, page_size=1000)
        }
        results = [row for row in results if row.get("buyer_id") == user["id"] or row.get("listing_id") in my_listing_ids]
    return [_offer_out(item) for item in results]


@router.post("/offers", status_code=status.HTTP_201_CREATED)
def create_offer(
    payload: OfferCreate,
    user: Dict[str, Any] = Depends(require_role(["COLLECTOR", "BUYER", "RECYCLER"])),
) -> Dict[str, Any]:
    listing = _record_or_404("listings", payload.listing_id)
    if listing["seller_id"] == user["id"]:
        raise HTTPException(status_code=409, detail="You cannot offer on your own listing.")
    if listing["status"] != "ACTIVE":
        raise HTTPException(status_code=409, detail="This listing is no longer accepting offers.")
    if str(listing.get("is_ewaste", "")).lower() == "true" and _user_role(user) != "RECYCLER":
        raise HTTPException(status_code=403, detail="Only recycling businesses may offer on e-waste.")
    existing = _repo("offers").find_one({
        "listing_id": payload.listing_id,
        "buyer_id": user["id"],
        "status": "PENDING",
    })
    if existing:
        raise HTTPException(status_code=409, detail="You already have a pending offer for this listing.")
    offer = _repo("offers").create({
        "lot_id": "",
        "listing_id": payload.listing_id,
        "buyer_id": user["id"],
        "offer_price": str(payload.offered_rate_per_kg),
        "quantity": listing.get("estimated_weight_kg", "0"),
        "unit": listing.get("unit", "kg"),
        "transport_cost_estimate": "",
        "valid_until": payload.proposed_pickup_time,
        "status": "PENDING",
        "note": payload.note or "",
    })
    _notify(listing["seller_id"], "New offer received", "A buyer has submitted an offer for your listing.", "listing", listing["id"])
    _audit(user, "offer.create", "offer", offer["id"])
    return _offer_out(offer)


@router.post("/offers/{offer_id}/accept")
def accept_offer(
    offer_id: str,
    user: Dict[str, Any] = Depends(require_role(["SELLER", "ADMIN"])),
) -> Dict[str, Any]:
    offer = _record_or_404("offers", offer_id)
    listing = _record_or_404("listings", offer["listing_id"])
    if _user_role(user) != "ADMIN" and listing["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the listing owner may accept an offer.")
    if listing["status"] != "ACTIVE" or offer["status"] != "PENDING":
        raise HTTPException(status_code=409, detail="This listing or offer is no longer available.")
    try:
        validate_status_transition("listing", listing["status"], "RESERVED")
        validate_status_transition("offer", offer["status"], "ACCEPTED")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    buyer = _record_or_404("users", offer["buyer_id"])
    accepted = _repo("offers").update(offer_id, {"status": "ACCEPTED"})
    _repo("listings").update(listing["id"], {"status": "RESERVED"})
    for other in _repo("offers").find_all({"listing_id": listing["id"], "status": "PENDING"}, page_size=1000):
        if other["id"] != offer_id:
            _repo("offers").update(other["id"], {"status": "REJECTED"})
    order = _repo("orders").create({
        "offer_id": offer_id,
        "listing_id": listing["id"],
        "lot_id": "",
        "seller_id": listing["seller_id"],
        "collector_id": buyer["id"] if buyer["role"] == "COLLECTOR" else "",
        "buyer_id": buyer["id"] if buyer["role"] == "BUYER" else "",
        "recycler_id": buyer["id"] if buyer["role"] == "RECYCLER" else "",
        "quantity": listing.get("estimated_weight_kg", "0"),
        "unit": listing.get("unit", "kg"),
        "agreed_price": offer["offer_price"],
        "status": "CONFIRMED",
        "payment_status": "PENDING",
        "scheduled_at": offer["valid_until"],
        "completed_at": "",
        "notes": offer.get("note", ""),
    })
    if buyer["role"] == "COLLECTOR":
        _repo("pickup_requests").create({
            "listing_id": listing["id"],
            "seller_id": listing["seller_id"],
            "collector_id": buyer["id"],
            "pickup_address": listing.get("pickup_address", ""),
            "scheduled_at": offer["valid_until"],
            "status": "SCHEDULED",
            "actual_weight_kg": "",
            "collection_notes": "",
            "evidence_paths": "[]",
        })
    _notify(buyer["id"], "Offer accepted", "The seller accepted your offer.", "order", order["id"])
    _audit(user, "offer.accept", "offer", offer_id)
    assert accepted is not None
    return _order_out(order)


@router.get("/orders")
def list_orders(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    orders = _repo("orders").find_all(page_size=1000)
    if _user_role(user) != "ADMIN":
        orders = [
            row for row in orders
            if user["id"] in {
                row.get("seller_id"),
                row.get("collector_id"),
                row.get("buyer_id"),
                row.get("recycler_id"),
            }
        ]
    return [_order_out(order) for order in orders]


@router.post("/orders/{order_id}/settle")
def settle_order(
    order_id: str,
    payload: SettleOrder,
    user: Dict[str, Any] = Depends(require_role(["COLLECTOR", "BUYER", "RECYCLER", "ADMIN"])),
) -> Dict[str, Any]:
    order = _record_or_404("orders", order_id)
    assigned_purchasers = {
        order.get("collector_id"),
        order.get("buyer_id"),
        order.get("recycler_id"),
    }
    if _user_role(user) != "ADMIN" and user["id"] not in assigned_purchasers:
        raise HTTPException(status_code=403, detail="Only the assigned purchaser may settle this order.")
    if order["status"] != "CONFIRMED":
        raise HTTPException(status_code=409, detail="Only confirmed orders may be settled.")
    try:
        validate_status_transition("order", order["status"], "HANDOVER_PENDING")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    now = datetime.now(timezone.utc).isoformat()
    rate = float(order.get("agreed_price") or 0)
    amount = round(payload.actual_weight_kg * rate, 2)
    changes = {
        "quantity": str(payload.actual_weight_kg),
        "status": "COMPLETED",
        "payment_status": payload.payment_status.upper(),
        "completed_at": now,
        "notes": payload.transaction_notes or "",
    }
    updated = _repo("orders").update(order_id, changes)
    listing = _record_or_404("listings", order["listing_id"])
    _repo("listings").update(listing["id"], {"status": "SOLD"})
    _repo("transactions").create({
        "order_id": order_id,
        "transaction_type": "SETTLEMENT",
        "amount": str(amount),
        "currency": "INR",
        "status": "COMPLETED",
        "recorded_at": now,
        "reference": str(uuid.uuid4()),
        "notes": payload.transaction_notes or "",
    })
    seller_stats = _repo("users").find_by_id(order["seller_id"]) or {}
    _repo("users").update(order["seller_id"], {
        "green_score_kg": str(float(seller_stats.get("green_score_kg") or 0) + payload.actual_weight_kg),
        "completed_transactions": str(int(float(seller_stats.get("completed_transactions") or 0)) + 1),
    })
    purchaser_id = order.get("collector_id") or order.get("buyer_id") or order.get("recycler_id")
    if purchaser_id and purchaser_id != order["seller_id"]:
        purchaser_stats = _repo("users").find_by_id(purchaser_id) or {}
        _repo("users").update(purchaser_id, {
            "completed_transactions": str(int(float(purchaser_stats.get("completed_transactions") or 0)) + 1),
        })
    if order.get("collector_id"):
        _repo("inventory_lots").create({
            "collector_id": order["collector_id"],
            "source_listing_id": listing["id"],
            "source_pickup_id": "",
            "material_category": listing.get("material_category", ""),
            "subcategory": listing.get("subcategory", ""),
            "quantity": str(payload.actual_weight_kg),
            "unit": listing.get("unit", "kg"),
            "weight_kg": str(payload.actual_weight_kg),
            "condition": listing.get("condition", ""),
            "asking_price": str(rate),
            "city": listing.get("city", ""),
            "status": "AVAILABLE",
            "notes": payload.transaction_notes or "",
        })
    if updated is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    _notify(order["seller_id"], "Order completed", "The collection was completed and recorded.", "order", order_id)
    _audit(user, "order.settle", "order", order_id)
    return _order_out(updated)


@router.get("/inventory")
def list_inventory(user: Dict[str, Any] = Depends(require_role(["COLLECTOR", "ADMIN"]))) -> List[Dict[str, Any]]:
    rows = _repo("inventory_lots").find_all(page_size=1000)
    if _user_role(user) != "ADMIN":
        rows = [row for row in rows if row.get("collector_id") == user["id"]]
    return rows


@router.get("/bulk-requirements")
def list_bulk_requirements(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    requirements = _repo("bulk_requirements").find_all(page_size=1000)
    if _user_role(user) not in {"COLLECTOR", "ADMIN"}:
        requirements = [item for item in requirements if item.get("buyer_id") == user["id"]]
    return requirements


@router.post("/bulk-requirements", status_code=status.HTTP_201_CREATED)
def create_bulk_requirement(
    payload: BulkRequirementCreate,
    user: Dict[str, Any] = Depends(require_role(["BUYER", "RECYCLER"])),
) -> Dict[str, Any]:
    requirement = _repo("bulk_requirements").create({
        **payload.model_dump(),
        "buyer_id": user["id"],
        "buyer_name": user.get("full_name", ""),
        "company_name": user.get("business_name") or user.get("full_name", ""),
    })
    _audit(user, "bulk_requirement.create", "bulk_requirement", requirement["id"])
    return requirement


@router.get("/notifications")
def list_notifications(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    return _repo("notifications").find_all({"user_id": user["id"]}, page_size=500)


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    notification = _record_or_404("notifications", notification_id)
    if notification["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You may only update your own notifications.")
    updated = _repo("notifications").update(notification_id, {"read_at": datetime.now(timezone.utc).isoformat()})
    assert updated is not None
    return updated


class SupportTicketCreate(BaseModel):
    order_id: Optional[str] = None
    category: str = Field(min_length=1, max_length=80)
    subject: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=5000)


class RateCreate(BaseModel):
    category: str
    name: str = Field(min_length=1, max_length=160)
    hindi_name: str = ""
    min_price: float = Field(ge=0)
    max_price: float = Field(ge=0)
    unit: str = "₹ / kg"
    market_source: str = Field(min_length=1, max_length=160)
    trend: str = "stable"
    description: str = ""
    is_regulated: bool = False


class RateUpdate(BaseModel):
    min_price: Optional[float] = Field(default=None, ge=0)
    max_price: Optional[float] = Field(default=None, ge=0)
    market_source: Optional[str] = Field(default=None, max_length=160)
    trend: Optional[str] = None
    description: Optional[str] = None


class VerificationCreate(BaseModel):
    document_type: str = Field(min_length=1, max_length=100)
    document_reference: str = Field(min_length=1, max_length=160)
    file_path: str = Field(min_length=1, max_length=500)
    business_name: Optional[str] = Field(default=None, max_length=160)


class ComplaintCreate(BaseModel):
    order_id: str
    reason: str = Field(min_length=1, max_length=160)
    details: str = Field(min_length=1, max_length=3000)


class ComplaintResolution(BaseModel):
    status: str = Field(pattern="^(INVESTIGATING|RESOLVED)$")
    resolution_notes: str = Field(min_length=1, max_length=3000)


class CategoryCreate(BaseModel):
    name: str = Field(pattern="^[a-z][a-z0-9_-]{1,39}$")
    display_name: str = Field(min_length=1, max_length=100)


class AccountStatusUpdate(BaseModel):
    account_status: str = Field(pattern="^(ACTIVE|SUSPENDED)$")


@router.get("/rates")
def list_rates(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    del user
    return _repo("rates").find_all(page_size=500)


@router.post("/rates", status_code=status.HTTP_201_CREATED)
def create_rate(
    payload: RateCreate,
    user: Dict[str, Any] = Depends(require_role(["ADMIN"])),
) -> Dict[str, Any]:
    if payload.max_price < payload.min_price:
        raise HTTPException(status_code=422, detail="max_price must be greater than or equal to min_price.")
    rate = _repo("rates").create({
        **payload.model_dump(),
        "category": payload.category.lower(),
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "is_regulated": str(payload.is_regulated).lower(),
    })
    _audit(user, "rate.create", "rate", rate["id"])
    return rate


@router.patch("/rates/{rate_id}")
def update_rate(
    rate_id: str,
    payload: RateUpdate,
    user: Dict[str, Any] = Depends(require_role(["ADMIN"])),
) -> Dict[str, Any]:
    rate = _record_or_404("rates", rate_id)
    changes = payload.model_dump(exclude_unset=True)
    new_min = changes.get("min_price", float(rate.get("min_price") or 0))
    new_max = changes.get("max_price", float(rate.get("max_price") or 0))
    if new_max < new_min:
        raise HTTPException(status_code=422, detail="max_price must be greater than or equal to min_price.")
    changes["last_updated"] = datetime.now(timezone.utc).isoformat()
    updated = _repo("rates").update(rate_id, changes)
    assert updated is not None
    _audit(user, "rate.update", "rate", rate_id)
    return updated


@router.get("/verifications")
def list_verifications(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    if _user_role(user) == "ADMIN":
        return _repo("verification_requests").find_all(page_size=1000)
    return _repo("verification_requests").find_all({"user_id": user["id"]}, page_size=500)


@router.post("/verifications", status_code=status.HTTP_201_CREATED)
def create_verification(
    payload: VerificationCreate,
    user: Dict[str, Any] = Depends(require_role(["COLLECTOR", "BUYER", "RECYCLER"])),
) -> Dict[str, Any]:
    existing = _repo("verification_requests").find_one({
        "user_id": user["id"],
        "verification_status": "PENDING",
    })
    if existing:
        raise HTTPException(status_code=409, detail="A verification request is already pending.")
    document = _repo("verification_requests").create({
        "user_id": user["id"],
        "user_name": user.get("full_name", ""),
        "role": _user_role(user),
        "business_name": payload.business_name or user.get("business_name", ""),
        "document_type": payload.document_type,
        "document_reference": payload.document_reference,
        "file_path": payload.file_path,
        "verification_status": "PENDING",
        "reviewed_by": "",
        "reviewed_at": "",
        "notes": "",
    })
    _notify(user["id"], "Verification submitted", "Your documents were submitted for review.", "verification", document["id"])
    _audit(user, "verification.create", "verification", document["id"])
    return document


@router.post("/verifications/{verification_id}/review")
def review_verification(
    verification_id: str,
    decision: str = Query(pattern="^(APPROVED|REJECTED)$"),
    user: Dict[str, Any] = Depends(require_role(["ADMIN"])),
) -> Dict[str, Any]:
    request = _record_or_404("verification_requests", verification_id)
    if request["verification_status"] != "PENDING":
        raise HTTPException(status_code=409, detail="This verification request has already been reviewed.")
    now = datetime.now(timezone.utc).isoformat()
    updated = _repo("verification_requests").update(verification_id, {
        "verification_status": decision,
        "reviewed_by": user["id"],
        "reviewed_at": now,
    })
    if not updated:
        raise HTTPException(status_code=404, detail="Verification request not found.")
    _repo("users").update(request["user_id"], {
        "verification_status": "VERIFIED" if decision == "APPROVED" else "REJECTED",
    })
    _notify(request["user_id"], "Verification reviewed", f"Your verification was {decision.lower()}.", "verification", verification_id)
    _audit(user, "verification.review", "verification", verification_id)
    return updated


@router.post("/complaints", status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    order = _record_or_404("orders", payload.order_id)
    participants = {order.get("seller_id"), order.get("collector_id"), order.get("buyer_id"), order.get("recycler_id")}
    if user["id"] not in participants and _user_role(user) != "ADMIN":
        raise HTTPException(status_code=403, detail="You may only report an order you participate in.")
    complaint = _repo("complaints").create({
        "order_id": payload.order_id,
        "reported_by_user_id": user["id"],
        "reported_by_name": user.get("full_name", ""),
        "reported_role": _user_role(user),
        "reason": payload.reason,
        "details": payload.details,
        "status": "OPEN",
        "resolution_notes": "",
    })
    _audit(user, "complaint.create", "complaint", complaint["id"])
    return complaint


@router.get("/complaints")
def list_complaints(user: Dict[str, Any] = Depends(require_role(["ADMIN"]))) -> List[Dict[str, Any]]:
    del user
    return _repo("complaints").find_all(page_size=1000)


@router.patch("/complaints/{complaint_id}")
def resolve_complaint(
    complaint_id: str,
    payload: ComplaintResolution,
    user: Dict[str, Any] = Depends(require_role(["ADMIN"])),
) -> Dict[str, Any]:
    complaint = _record_or_404("complaints", complaint_id)
    if complaint["status"] == "RESOLVED":
        raise HTTPException(status_code=409, detail="This complaint is already resolved.")
    updated = _repo("complaints").update(complaint_id, {
        "status": payload.status,
        "resolution_notes": payload.resolution_notes,
    })
    assert updated is not None
    _audit(user, "complaint.resolve", "complaint", complaint_id)
    return updated


@router.get("/admin/users")
def list_users(user: Dict[str, Any] = Depends(require_role(["ADMIN"]))) -> List[Dict[str, Any]]:
    del user
    results = _repo("users").find_all(page_size=1000)
    for item in results:
        item.pop("password_hash", None)
    return results


@router.patch("/admin/users/{user_id}/status")
def update_user_status(
    user_id: str,
    payload: AccountStatusUpdate,
    user: Dict[str, Any] = Depends(require_role(["ADMIN"])),
) -> Dict[str, Any]:
    target = _record_or_404("users", user_id)
    if target["role"] == "ADMIN" and payload.account_status == "SUSPENDED":
        admin_count = _repo("users").count({"role": "ADMIN", "account_status": "ACTIVE"})
        if admin_count <= 1:
            raise HTTPException(status_code=409, detail="Cannot suspend the last active administrator.")
    updated = _repo("users").update(user_id, {"account_status": payload.account_status})
    assert updated is not None
    updated.pop("password_hash", None)
    _audit(user, "user.status", "user", user_id)
    return updated


@router.get("/categories")
def list_categories(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    del user
    return _repo("categories").find_all({"active": "true"}, page_size=500)


@router.post("/categories", status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    user: Dict[str, Any] = Depends(require_role(["ADMIN"])),
) -> Dict[str, Any]:
    name = payload.name.lower()
    if _repo("categories").exists({"name": name}):
        raise HTTPException(status_code=409, detail="That category already exists.")
    category = _repo("categories").create({
        "name": name,
        "display_name": payload.display_name,
        "active": "true",
    })
    _audit(user, "category.create", "category", category["id"])
    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_category(
    category_id: str,
    user: Dict[str, Any] = Depends(require_role(["ADMIN"])),
) -> None:
    category = _record_or_404("categories", category_id)
    _repo("categories").update(category_id, {"active": "false"})
    _audit(user, "category.deactivate", "category", category_id)


@router.post("/support/tickets", status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    payload: SupportTicketCreate,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    if payload.order_id:
        order = _record_or_404("orders", payload.order_id)
        participant_ids = {order.get("seller_id"), order.get("collector_id"), order.get("buyer_id"), order.get("recycler_id")}
        if user["id"] not in participant_ids and _user_role(user) != "ADMIN":
            raise HTTPException(status_code=403, detail="You may only open a ticket for your own order.")
    ticket = _repo("support_tickets").create({
        "user_id": user["id"],
        "order_id": payload.order_id or "",
        "category": payload.category,
        "subject": payload.subject,
        "description": payload.description,
        "status": "OPEN",
        "assigned_to": "",
        "resolution": "",
    })
    _audit(user, "support_ticket.create", "support_ticket", ticket["id"])
    return ticket


@router.get("/support/tickets")
def list_support_tickets(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    if _user_role(user) == "ADMIN":
        return _repo("support_tickets").find_all(page_size=1000)
    return _repo("support_tickets").find_all({"user_id": user["id"]}, page_size=500)
