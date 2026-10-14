"""
Status transition validation for all entities.

Enforces that status changes follow the defined lifecycle machines.
Raises ValueError for invalid transitions — callers convert to HTTP 422.
"""
from typing import Dict, List

# ── Listing ────────────────────────────────────────────────────────────────
LISTING_TRANSITIONS: Dict[str, List[str]] = {
    "DRAFT":     ["ACTIVE", "CANCELLED"],
    "ACTIVE":    ["RESERVED", "CANCELLED"],
    "RESERVED":  ["SOLD", "ACTIVE"],   # ACTIVE = offer fell through
    "SOLD":      [],
    "CANCELLED": [],
}

# ── Pickup Request ─────────────────────────────────────────────────────────
PICKUP_TRANSITIONS: Dict[str, List[str]] = {
    "REQUESTED":   ["ACCEPTED", "REJECTED", "CANCELLED"],
    "ACCEPTED":    ["SCHEDULED", "CANCELLED"],
    "SCHEDULED":   ["IN_PROGRESS", "CANCELLED"],
    "IN_PROGRESS": ["COMPLETED", "CANCELLED"],
    "COMPLETED":   [],
    "REJECTED":    [],
    "CANCELLED":   [],
}

# ── Offer ──────────────────────────────────────────────────────────────────
OFFER_TRANSITIONS: Dict[str, List[str]] = {
    "PENDING":   ["ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"],
    "ACCEPTED":  [],
    "REJECTED":  [],
    "WITHDRAWN": [],
    "EXPIRED":   [],
}

# ── Order ──────────────────────────────────────────────────────────────────
ORDER_TRANSITIONS: Dict[str, List[str]] = {
    "CREATED":          ["CONFIRMED", "CANCELLED"],
    "CONFIRMED":        ["HANDOVER_PENDING", "CANCELLED"],
    "HANDOVER_PENDING": ["COMPLETED", "DISPUTED"],
    "COMPLETED":        [],
    "CANCELLED":        [],
    "DISPUTED":         ["COMPLETED", "CANCELLED"],
}

# ── Inventory Lot ──────────────────────────────────────────────────────────
LOT_TRANSITIONS: Dict[str, List[str]] = {
    "AVAILABLE": ["RESERVED", "ARCHIVED"],
    "RESERVED":  ["SOLD", "AVAILABLE"],   # AVAILABLE = offer fell through
    "SOLD":      [],
    "ARCHIVED":  [],
}

_TRANSITION_MAP = {
    "listing":          LISTING_TRANSITIONS,
    "pickup_request":   PICKUP_TRANSITIONS,
    "offer":            OFFER_TRANSITIONS,
    "order":            ORDER_TRANSITIONS,
    "inventory_lot":    LOT_TRANSITIONS,
}


def validate_status_transition(
    entity_type: str, current_status: str, new_status: str
) -> None:
    """
    Raise ValueError if the transition from current_status -> new_status
    is not permitted for the given entity_type.

    Args:
        entity_type:    One of listing, pickup_request, offer, order, inventory_lot
        current_status: The current status value (will be uppercased)
        new_status:     The proposed new status (will be uppercased)
    """
    transitions = _TRANSITION_MAP.get(entity_type)
    if transitions is None:
        raise ValueError(f"Unknown entity type for status validation: '{entity_type}'")

    current = current_status.upper()
    new = new_status.upper()

    allowed = transitions.get(current, [])
    if new not in allowed:
        raise ValueError(
            f"Invalid {entity_type} status transition: "
            f"'{current}' → '{new}'. "
            f"Allowed transitions from '{current}': {allowed or ['(none — terminal state)']}"
        )

