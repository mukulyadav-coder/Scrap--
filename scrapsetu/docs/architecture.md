# ScrapSetu — Architecture Documentation

## Overview

ScrapSetu is a vernacular-first e-waste and recyclable-material marketplace
connecting Sellers, Collectors (kabadiwalas), Buyers, Recyclers, and Administrators.

This document describes the web client and v1.0 authenticated API using
CSV-first persistent storage.

---

## System Components

```
┌──────────────────────────────────────────────────────────────┐
│                      ScrapSetu System                        │
│                                                              │
│  ┌─────────────────┐    ┌──────────────────────────────────┐ │
│  │  Mobile App     │    │  ScrapSetu Backend (Port 8001)   │ │
│  │  Expo / RN      │◄──►│  FastAPI + CSV Storage           │ │
│  │  iOS + Android  │    │                                  │ │
│  └─────────────────┘    │  ┌──────────────────────────┐   │ │
│                         │  │  Service Layer           │   │ │
│  ┌─────────────────┐    │  │  (Business Logic)        │   │ │
│  │  Web Client     │    │  └────────────┬─────────────┘   │ │
│  │  React + Vite   │◄──►│               │                 │ │
│  │  (Existing)     │    │  ┌────────────▼─────────────┐   │ │
│  └─────────────────┘    │  │  Repository Interface    │   │ │
│                         │  │  (BaseRepository ABC)    │   │ │
│                         │  └────────────┬─────────────┘   │ │
│  ┌─────────────────┐    │               │                 │ │
│  │  Legacy Backend │    │  ┌────────────▼─────────────┐   │ │
│  │  Port 8000      │    │  │  CsvRepository (v1)      │   │ │
│  │  SQLite         │    │  │  (Future: PgRepository)  │   │ │
│  └─────────────────┘    │  └────────────┬─────────────┘   │ │
│                         │               │                 │ │
│                         │  ┌────────────▼─────────────┐   │ │
│                         │  │  data/csv/*.csv          │   │ │
│                         │  │  (CSV entity repositories)│   │ │
│                         │  └──────────────────────────┘   │ │
│                         └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Ports

| Component | Port | Notes |
|---|---|---|
| ScrapSetu Backend (new) | 8001 | CSV storage, full auth |
| Legacy Kabadiwala Connect Backend | 8000 | SQLite, preserved |
| Web Client (Vite) | 5173 | Existing, preserved |
| Mobile App (Expo Go) | 8081 | New, targets port 8001 |

---

## Storage Architecture

### Repository Pattern

All business logic depends on the `BaseRepository` interface, not on CSV directly.
This makes the storage layer swappable.

```
Service Layer
    │
    └──► BaseRepository (Abstract)
              │
    ┌─────────┴─────────┐
    │                   │
CsvRepository     PgRepository (future)
    │                   │
data/csv/         PostgreSQL tables
```

### Storage Factory

`STORAGE_BACKEND=csv` (env var) controls which implementation is used.

```python
# storage_factory.py
def get_repository(entity: str) -> BaseRepository:
    backend = settings.STORAGE_BACKEND
    if backend == "csv":
        return CsvRepository(entity, CSV_HEADERS[entity])
    elif backend == "postgresql":
        return PgRepository(entity)  # Future
    raise ValueError(f"Unknown storage backend: {backend}")
```

---

## Material Flow

```
Seller creates DRAFT listing
        │
        ▼
Listing goes ACTIVE (visible to collectors)
        │
        ▼
Collector accepts pickup request → REQUESTED → ACCEPTED → COMPLETED
        │
        ▼
Collector creates Inventory Lot from collected material
        │
        ▼
Buyer/Recycler browses Inventory Lots
        │
        ▼
Buyer submits Offer (PENDING)
        │
        ▼
Collector accepts Offer → Lot becomes RESERVED → Order CREATED
        │
        ▼
Handover recorded by both parties → Order COMPLETED
        │
        ▼
Transaction recorded, Lot becomes SOLD
```

---

## Security Architecture

### Authentication
- JWT-based (access token 15 min, refresh token 7 days)
- bcrypt password hashing
- The web client keeps the short-lived access token in memory and stores the refresh token in an HttpOnly, SameSite=Strict cookie.
- `POST /api/auth/register` accepts `full_name`, `email`, `phone`, `password`, `role`, optional `seller_type`/`business_name`, `city`, optional `locality`, and `preferred_language`. Self-registration is limited to SELLER, COLLECTOR, BUYER, and RECYCLER.
- `POST /api/auth/login` accepts `email` and `password`; the access-token response omits the refresh token, which is set as an HttpOnly cookie.
- `POST /api/auth/refresh` renews the token pair from the cookie. `GET /api/auth/me` requires a bearer access token. `POST /api/auth/logout` clears the refresh cookie.
- The web client remembers only the email when requested; it never persists passwords or access/refresh tokens in browser storage.
- ADMIN role: never self-registerable, seeded at startup only

### Authorization
- The ScrapSetu marketplace endpoints validate bearer tokens and enforce role
  restrictions for listing creation, offer submission/acceptance, order
  settlement, inventory, rates, verification review, and complaint resolution.
- Listing changes are limited to the owner (or Admin); offers are limited to
  the buyer and the owner's listings; settlements are limited to assigned
  purchasers (or Admin).
- The web client derives its dashboard from the authenticated server role.
- The separate legacy port-8000 API has no JWT or owner-level authorization.
  Do not expose it publicly until it is migrated or secured independently.

### Rate Limiting
- Login: 5 attempts per IP per minute (in-memory counter)
- Registration: 10 per IP per hour

### Web authentication setup and remaining gaps

Run the authentication API from `scrapsetu/backend` with:

```text
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Set `JWT_SECRET` to a randomly generated value of at least 32 characters before startup. To provision the initial administrator, set `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` in the backend environment; the seed password must be at least 12 characters and include an uppercase letter and a digit. These values are server-only and are intentionally blank in `.env.example`.

The Vite development server proxies `/api` to port 8001. Production deployments
should serve the API under the same site as the web app, or configure a
same-site reverse proxy, so the `SameSite=Strict` refresh cookie remains
available. Configure `CORS_ORIGINS` to exact trusted origins; do not use
wildcard origins with credentials.

Password recovery is not implemented: there are no forgot-password or reset-password schemas, token service, or endpoints. The web page reports this rather than accepting or simulating a recovery request. Logout clears the browser's refresh cookie and in-memory access token; because current JWTs are stateless, an already-issued access token remains valid until its short expiry.

Buyer and Recycler accounts currently share the bulk procurement dashboard,
with Recycler displayed as its own authenticated role. The verification API
supports document requests and Admin review, but the client does not yet expose
the document-submission workflow. Complaint reporting, profile editing, and
support ticket APIs likewise do not yet have connected client screens.

Listing photos are uploaded to the configured local `UPLOADS_DIR` and served
from `/uploads`. This storage is not private object storage and should not be
used for sensitive documents or production-scale deployments.

Marketplace API data is loaded from the authenticated API rather than browser
localStorage. The language preference is the only application preference
persisted in localStorage; the optional remembered email is not a credential.

---

## CSV Concurrency Model

CSV is not thread-safe by default. Safeguards implemented:

1. **FileLock**: One write at a time per CSV file using `filelock`
2. **Atomic writes**: Write to `.tmp` then `os.replace()` 
3. **Backups**: `.bak` created before destructive operations
4. **Header validation**: Headers verified on every open

> [!WARNING]
> CSV storage is suitable for a small development pilot (< 100 concurrent users).
> For production with concurrent writes, migrate to PostgreSQL. See migration guide.

---

## Status Transition Machines

### Listing
```
DRAFT → ACTIVE → RESERVED → SOLD
              ↓          ↓
         CANCELLED  CANCELLED
```

### Pickup Request
```
REQUESTED → ACCEPTED → SCHEDULED → IN_PROGRESS → COMPLETED
                ↓
           REJECTED/CANCELLED
```

### Offer
```
PENDING → ACCEPTED
        → REJECTED
        → WITHDRAWN
        → EXPIRED
```

### Order
```
CREATED → CONFIRMED → HANDOVER_PENDING → COMPLETED
                ↓
           CANCELLED / DISPUTED
```
