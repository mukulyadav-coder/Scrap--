"""
CSV-based repository implementation.

Design decisions:
- filelock.FileLock for write serialization (one writer at a time per file)
- Atomic writes: write to .tmp then os.replace() to prevent partial writes
- Backup (.bak) created before every destructive operation
- Header validation on every open to detect corrupt files
- Pagination to avoid loading unlimited data into memory
- UTF-8 encoding throughout
- ISO 8601 UTC timestamps
- UUID v4 primary keys generated server-side

Limitations:
- Not suitable for high-concurrency production (> ~20 concurrent writers)
- File locking is per-process; not safe across multiple server instances
- No transactions across multiple CSV files
- For production: migrate to PostgreSQL using the migration guide

STORAGE_BACKEND=csv (controlled via config/env)
"""
import csv
import io
import logging
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional

try:
    from filelock import FileLock, Timeout as FileLockTimeout
except ImportError:
    FileLock = None  # type: ignore
    FileLockTimeout = Exception  # type: ignore

from app.storage.base import BaseRepository

logger = logging.getLogger(__name__)

# Thread-level lock dict for same-process concurrency (in addition to filelock)
_thread_locks: Dict[str, Lock] = {}


def _get_thread_lock(path: str) -> Lock:
    if path not in _thread_locks:
        _thread_locks[path] = Lock()
    return _thread_locks[path]


class CsvRepository(BaseRepository):
    """
    CSV-backed implementation of BaseRepository.

    Each entity is stored in its own CSV file under CSV_DATA_DIR.
    """

    def __init__(self, entity_name: str, headers: List[str], data_dir: Path):
        self.entity_name = entity_name
        self.headers = headers
        self.data_dir = data_dir
        self.csv_path = data_dir / f"{entity_name}.csv"
        self.lock_path = data_dir / f"{entity_name}.lock"
        self.tmp_path = data_dir / f"{entity_name}.tmp"
        self.bak_path = data_dir / f"{entity_name}.bak"
        self._ensure_file()

    # ──────────────────────────────────────────────────────────
    # File Management
    # ──────────────────────────────────────────────────────────

    def _ensure_file(self) -> None:
        """Create CSV file with headers if it doesn't exist."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        if not self.csv_path.exists():
            self._write_rows([])
            logger.info(f"Created CSV file: {self.csv_path}")

    def _validate_headers(self, actual: List[str]) -> None:
        """Raise ValueError if CSV headers don't match expected schema."""
        if actual != self.headers:
            missing = set(self.headers) - set(actual)
            extra = set(actual) - set(self.headers)
            raise ValueError(
                f"CSV header mismatch for {self.entity_name}. "
                f"Missing: {missing}. Extra: {extra}."
            )

    def _backup(self) -> None:
        """Create a backup of the current CSV file."""
        if self.csv_path.exists():
            shutil.copy2(self.csv_path, self.bak_path)

    # ──────────────────────────────────────────────────────────
    # Read Operations
    # ──────────────────────────────────────────────────────────

    def _read_all_rows(self) -> List[Dict[str, Any]]:
        """Read all rows from the CSV file."""
        if not self.csv_path.exists():
            return []
        try:
            with open(self.csv_path, "r", encoding="utf-8", newline="") as f:
                reader = csv.DictReader(f)
                if reader.fieldnames:
                    self._validate_headers(list(reader.fieldnames))
                return [dict(row) for row in reader]
        except (OSError, csv.Error) as exc:
            logger.error(f"Failed to read {self.csv_path}: {exc}")
            # Attempt recovery from backup
            if self.bak_path.exists():
                logger.warning(f"Attempting recovery from backup: {self.bak_path}")
                shutil.copy2(self.bak_path, self.csv_path)
                return self._read_all_rows()
            return []

    def _write_rows(self, rows: List[Dict[str, Any]]) -> None:
        """Atomically write rows to CSV using file lock."""
        thread_lock = _get_thread_lock(str(self.csv_path))
        with thread_lock:
            if FileLock is not None:
                file_lock = FileLock(str(self.lock_path), timeout=10)
                with file_lock:
                    self._atomic_write(rows)
            else:
                self._atomic_write(rows)

    def _atomic_write(self, rows: List[Dict[str, Any]]) -> None:
        """Write to temp file then atomically replace the original."""
        try:
            with open(self.tmp_path, "w", encoding="utf-8", newline="") as f:
                writer = csv.DictWriter(
                    f,
                    fieldnames=self.headers,
                    quoting=csv.QUOTE_ALL,
                    extrasaction="ignore",
                )
                writer.writeheader()
                for row in rows:
                    # Normalize: ensure all header columns present
                    normalized = {h: row.get(h, "") for h in self.headers}
                    writer.writerow(normalized)
            os.replace(self.tmp_path, self.csv_path)
        except Exception as exc:
            logger.error(f"Failed to write {self.csv_path}: {exc}")
            # Clean up tmp file if it exists
            if self.tmp_path.exists():
                try:
                    self.tmp_path.unlink()
                except OSError:
                    pass
            raise

    # ──────────────────────────────────────────────────────────
    # Filter Helpers
    # ──────────────────────────────────────────────────────────

    def _matches_filters(
        self, row: Dict[str, Any], filters: Dict[str, Any]
    ) -> bool:
        """
        Check if a row matches all filters.

        Supports:
        - Equality: {'status': 'ACTIVE'}
        - Contains: {'title__contains': 'metal'}
        - In list: {'status__in': ['ACTIVE', 'DRAFT']}
        """
        for key, value in filters.items():
            if key.endswith("__contains"):
                field = key[: -len("__contains")]
                if value.lower() not in str(row.get(field, "")).lower():
                    return False
            elif key.endswith("__in"):
                field = key[: -len("__in")]
                if row.get(field, "") not in value:
                    return False
            else:
                if str(row.get(key, "")) != str(value):
                    return False
        return True

    def _sort_rows(
        self,
        rows: List[Dict[str, Any]],
        order_by: Optional[str],
        order_desc: bool,
    ) -> List[Dict[str, Any]]:
        if not order_by or order_by not in self.headers:
            # Default: sort by created_at desc
            order_by = "created_at" if "created_at" in self.headers else None
        if order_by:
            rows = sorted(
                rows,
                key=lambda r: r.get(order_by, ""),
                reverse=order_desc,
            )
        return rows

    # ──────────────────────────────────────────────────────────
    # BaseRepository Implementation
    # ──────────────────────────────────────────────────────────

    def find_all(
        self,
        filters: Optional[Dict[str, Any]] = None,
        page: int = 1,
        page_size: int = 50,
        order_by: Optional[str] = None,
        order_desc: bool = True,
    ) -> List[Dict[str, Any]]:
        rows = self._read_all_rows()
        if filters:
            rows = [r for r in rows if self._matches_filters(r, filters)]
        rows = self._sort_rows(rows, order_by, order_desc)
        # Pagination
        start = (page - 1) * page_size
        return rows[start : start + page_size]

    def find_by_id(self, record_id: str) -> Optional[Dict[str, Any]]:
        for row in self._read_all_rows():
            if row.get("id") == record_id:
                return row
        return None

    def find_one(self, filters: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for row in self._read_all_rows():
            if self._matches_filters(row, filters):
                return row
        return None

    def create(self, record: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        new_record = {h: "" for h in self.headers}
        new_record.update(record)
        # Always generate server-side ID and timestamps
        new_record["id"] = str(uuid.uuid4())
        if "created_at" in self.headers:
            new_record["created_at"] = now
        if "updated_at" in self.headers:
            new_record["updated_at"] = now
        # Special case: audit_log uses 'timestamp' instead of created_at
        if "timestamp" in self.headers and "timestamp" not in record:
            new_record["timestamp"] = now

        rows = self._read_all_rows()
        rows.append(new_record)
        self._write_rows(rows)
        logger.info(f"Created {self.entity_name} id={new_record['id']}")
        return new_record

    def update(
        self, record_id: str, updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        rows = self._read_all_rows()
        updated = None
        new_rows = []
        for row in rows:
            if row.get("id") == record_id:
                # Prevent overwriting immutable fields
                updates.pop("id", None)
                updates.pop("created_at", None)
                row.update(updates)
                if "updated_at" in self.headers:
                    row["updated_at"] = datetime.now(timezone.utc).isoformat()
                updated = row
            new_rows.append(row)

        if updated is None:
            return None

        self._backup()
        self._write_rows(new_rows)
        logger.info(f"Updated {self.entity_name} id={record_id}")
        return updated

    def delete(self, record_id: str) -> bool:
        rows = self._read_all_rows()
        new_rows = [r for r in rows if r.get("id") != record_id]
        if len(new_rows) == len(rows):
            return False  # not found
        self._backup()
        self._write_rows(new_rows)
        logger.info(f"Deleted {self.entity_name} id={record_id}")
        return True

    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        rows = self._read_all_rows()
        if filters:
            rows = [r for r in rows if self._matches_filters(r, filters)]
        return len(rows)

    def exists(self, filters: Dict[str, Any]) -> bool:
        return self.find_one(filters) is not None

