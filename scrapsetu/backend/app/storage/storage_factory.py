"""
Storage factory — creates the correct repository implementation
based on the STORAGE_BACKEND configuration setting.

Usage:
    from app.storage.storage_factory import get_repository
    users_repo = get_repository("users")
    listing_repo = get_repository("listings")

To switch to PostgreSQL in the future:
    Set STORAGE_BACKEND=postgresql in .env
    Implement PgRepository(BaseRepository)
    Register it in BACKENDS below
"""
from pathlib import Path
from typing import Dict, List

from app.config import settings
from app.storage.base import BaseRepository
from app.storage.csv_repository import CsvRepository

# ──────────────────────────────────────────────────────────────
# CSV Header Definitions
# These define the canonical schema for each entity.
# When migrating to PostgreSQL, these columns map 1:1 to table columns.
# ──────────────────────────────────────────────────────────────

CSV_HEADERS: Dict[str, List[str]] = {
    "users": [
        "id", "full_name", "email", "phone", "password_hash",
        "role", "account_status", "verification_status",
        "seller_type", "business_name", "city", "locality",
        "preferred_language", "green_score_kg", "completed_transactions",
        "created_at", "updated_at",
    ],
    "listings": [
        "id", "seller_id", "title", "material_category", "subcategory",
        "description", "condition", "quantity", "unit",
        "estimated_weight_kg", "price_expectation", "image_paths",
        "pickup_address", "city", "locality", "status",
        "is_ewaste", "ewaste_compliance_accepted", "notes",
        "created_at", "updated_at",
    ],
    "rates": [
        "id", "category", "name", "hindi_name", "min_price", "max_price",
        "unit", "last_updated", "market_source", "trend", "description",
        "is_regulated",
    ],
    "categories": [
        "id", "name", "display_name", "active", "created_at", "updated_at",
    ],
    "pickup_requests": [
        "id", "listing_id", "seller_id", "collector_id",
        "pickup_address", "scheduled_at", "status",
        "actual_weight_kg", "collection_notes", "evidence_paths",
        "created_at", "updated_at",
    ],
    "inventory_lots": [
        "id", "collector_id", "source_listing_id", "source_pickup_id",
        "material_category", "subcategory", "quantity", "unit",
        "weight_kg", "condition", "asking_price", "city", "status", "notes",
        "created_at", "updated_at",
    ],
    "offers": [
        "id", "lot_id", "listing_id", "buyer_id",
        "offer_price", "quantity", "unit", "transport_cost_estimate",
        "valid_until", "status", "note",
        "created_at", "updated_at",
    ],
    "bulk_requirements": [
        "id", "buyer_id", "buyer_name", "company_name", "category",
        "subcategory", "min_quantity_kg", "offered_rate_per_kg",
        "purity_grade", "locality", "valid_till", "notes",
        "created_at", "updated_at",
    ],
    "verification_requests": [
        "id", "user_id", "user_name", "role", "business_name",
        "document_type", "document_reference", "file_path",
        "verification_status", "reviewed_by", "reviewed_at", "notes",
        "created_at", "updated_at",
    ],
    "complaints": [
        "id", "order_id", "reported_by_user_id", "reported_by_name",
        "reported_role", "reason", "details", "status", "created_at",
        "resolution_notes",
    ],
    "orders": [
        "id", "offer_id", "listing_id", "lot_id",
        "seller_id", "collector_id", "buyer_id", "recycler_id",
        "quantity", "unit", "agreed_price",
        "status", "payment_status",
        "scheduled_at", "completed_at", "notes",
        "created_at", "updated_at",
    ],
    "transactions": [
        "id", "order_id", "transaction_type", "amount", "currency",
        "status", "recorded_at", "reference", "notes",
    ],
    "payments": [
        "id", "order_id", "payer_id", "payee_id",
        "amount", "currency", "method", "status", "external_reference",
        "created_at", "updated_at",
    ],
    "handover_records": [
        "id", "order_id", "handed_over_by", "received_by",
        "quantity", "weight_kg", "condition",
        "evidence_paths", "notes", "confirmed_at", "status",
    ],
    "recycler_documents": [
        "id", "recycler_id", "document_type", "file_path",
        "document_reference", "expiry_date",
        "verification_status", "reviewed_by", "reviewed_at", "notes",
    ],
    "notifications": [
        "id", "user_id", "title", "message", "type",
        "related_entity_type", "related_entity_id",
        "read_at", "created_at",
    ],
    "support_tickets": [
        "id", "user_id", "order_id", "category",
        "subject", "description", "status",
        "assigned_to", "resolution",
        "created_at", "updated_at",
    ],
    "audit_log": [
        "id", "actor_id", "action", "entity_type", "entity_id",
        "request_id", "ip_address", "timestamp", "outcome", "details",
    ],
    "app_settings": [
        "key", "value", "updated_at", "updated_by",
    ],
    "password_reset_tokens": [
        "id", "user_id", "token_digest", "expires_at", "consumed_at",
        "created_at",
    ],
}

# Cache of repository instances (one per entity per backend)
_repo_cache: Dict[str, BaseRepository] = {}


def get_repository(entity_name: str) -> BaseRepository:
    """
    Return the appropriate repository for the given entity.

    Repository instances are cached per entity name.
    The storage backend is controlled by STORAGE_BACKEND in config.

    Args:
        entity_name: One of the keys in CSV_HEADERS (e.g., 'users', 'listings')

    Returns:
        A concrete BaseRepository implementation

    Raises:
        ValueError: If entity_name is unknown or backend is unsupported
    """
    if entity_name not in CSV_HEADERS:
        raise ValueError(
            f"Unknown entity: '{entity_name}'. "
            f"Valid entities: {list(CSV_HEADERS.keys())}"
        )

    cache_key = f"{settings.STORAGE_BACKEND}:{entity_name}"
    if cache_key in _repo_cache:
        return _repo_cache[cache_key]

    backend = settings.STORAGE_BACKEND.lower()

    if backend == "csv":
        data_dir = settings.get_csv_dir()
        repo = CsvRepository(
            entity_name=entity_name,
            headers=CSV_HEADERS[entity_name],
            data_dir=data_dir,
        )
    elif backend == "postgresql":
        # Future: import and instantiate PgRepository
        raise NotImplementedError(
            "PostgreSQL backend not yet implemented. "
            "See docs/csv-to-postgresql-migration.md for the migration guide."
        )
    else:
        raise ValueError(f"Unsupported storage backend: '{backend}'")

    _repo_cache[cache_key] = repo
    return repo


def clear_repository_cache() -> None:
    """Clear the repository instance cache. Useful for testing."""
    _repo_cache.clear()
