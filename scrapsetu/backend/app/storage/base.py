"""Abstract base repository interface for ScrapSetu storage layer."""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseRepository(ABC):
    """
    Abstract repository interface for CRUD operations.

    All service-layer code depends on this interface, not on the
    concrete CSV or database implementation. This enables swapping
    the storage backend without rewriting business logic.
    """

    @abstractmethod
    def find_all(
        self,
        filters: Optional[Dict[str, Any]] = None,
        page: int = 1,
        page_size: int = 50,
        order_by: Optional[str] = None,
        order_desc: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Return a paginated list of records matching optional filters.

        Supports equality filters (field=value) and contains filters
        (field__contains=value).
        """

    @abstractmethod
    def find_by_id(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Return a single record by primary key, or None if not found."""

    @abstractmethod
    def find_one(
        self, filters: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Return the first record matching all filters, or None."""

    @abstractmethod
    def create(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persist a new record. The implementation generates a UUID id,
        created_at, and updated_at timestamps. Never trust caller-provided
        id values for new records.
        """

    @abstractmethod
    def update(
        self, record_id: str, updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Apply updates to an existing record. Returns the updated record,
        or None if no record with that id exists.
        """

    @abstractmethod
    def delete(self, record_id: str) -> bool:
        """
        Delete a record by id. Returns True if deleted, False if not found.
        Creates a backup before deletion.
        """

    @abstractmethod
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Return the total count of records matching optional filters."""

    @abstractmethod
    def exists(self, filters: Dict[str, Any]) -> bool:
        """Return True if at least one record matches the given filters."""

