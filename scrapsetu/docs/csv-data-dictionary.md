# ScrapSetu — CSV Data Dictionary

All CSV files are stored in `scrapsetu/backend/data/csv/`.
Encoding: UTF-8. Timestamps: ISO 8601 UTC. IDs: UUID v4.
Booleans: `true`/`false` (lowercase string). Nulls: empty string `""`.

---

## 1. users.csv

Stores all registered users across all roles.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| full_name | string | User's full name |
| email | string | Email (unique, lowercased) |
| phone | string | E.164 format, e.g. +919876543210 |
| password_hash | string | bcrypt hash — NEVER in exports |
| role | enum | SELLER, COLLECTOR, BUYER, RECYCLER, ADMIN |
| account_status | enum | ACTIVE, SUSPENDED, PENDING_VERIFICATION |
| verification_status | enum | UNVERIFIED, PENDING, VERIFIED, REJECTED |
| seller_type | enum | individual, household, office, business (seller only) |
| business_name | string | Optional business name |
| city | string | Operating city |
| locality | string | Neighborhood / locality |
| preferred_language | enum | en, hi |
| green_score_kg | decimal | Total kg of material diverted from landfill |
| completed_transactions | integer | Count of completed orders |
| created_at | ISO 8601 UTC | Account creation timestamp |
| updated_at | ISO 8601 UTC | Last update timestamp |

**Constraints:**
- `email` must be unique (enforced in application code)
- `phone` must be unique (enforced in application code)  
- `role` must not be set to ADMIN via self-registration endpoint
- `password_hash` must never appear in exports or logs

---

## 2. listings.csv

Waste material listings created by Sellers.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| seller_id | UUID | FK → users.id |
| title | string | Short listing title |
| material_category | enum | paper, cardboard, plastic, metal, e_waste, other |
| subcategory | string | Specific material sub-type |
| description | string | Detailed description |
| condition | enum | clean_sorted, mixed, unsegregated |
| quantity | decimal | Amount available |
| unit | enum | kg, pieces, lot |
| estimated_weight_kg | decimal | Estimated weight in kg |
| price_expectation | decimal | Seller's expected price per kg (optional) |
| image_paths | JSON array | List of upload paths |
| pickup_address | string | Full pickup address |
| city | string | City |
| locality | string | Neighborhood |
| status | enum | DRAFT, ACTIVE, RESERVED, SOLD, CANCELLED |
| is_ewaste | boolean | Whether item is regulated e-waste |
| ewaste_compliance_accepted | boolean | Seller accepted e-waste compliance terms |
| notes | string | Additional pickup notes |
| created_at | ISO 8601 UTC | |
| updated_at | ISO 8601 UTC | |

---

## 3. pickup_requests.csv

Pickup requests linking Sellers and Collectors.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| listing_id | UUID | FK → listings.id |
| seller_id | UUID | FK → users.id (role=SELLER) |
| collector_id | UUID | FK → users.id (role=COLLECTOR), empty until assigned |
| pickup_address | string | Address for pickup |
| scheduled_at | ISO 8601 UTC | Scheduled pickup datetime |
| status | enum | REQUESTED, ACCEPTED, SCHEDULED, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED |
| actual_weight_kg | decimal | Actual weight collected (set on completion) |
| collection_notes | string | Collector's notes |
| evidence_paths | JSON array | Photo evidence paths |
| created_at | ISO 8601 UTC | |
| updated_at | ISO 8601 UTC | |

---

## 4. inventory_lots.csv

Inventory lots managed by Collectors.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| collector_id | UUID | FK → users.id (role=COLLECTOR) |
| source_listing_id | UUID | FK → listings.id (optional) |
| source_pickup_id | UUID | FK → pickup_requests.id (optional) |
| material_category | enum | Same as listings |
| subcategory | string | |
| quantity | decimal | |
| unit | enum | kg, pieces, lot |
| weight_kg | decimal | |
| condition | enum | |
| asking_price | decimal | Price per kg/unit |
| city | string | |
| status | enum | AVAILABLE, RESERVED, SOLD, ARCHIVED |
| notes | string | |
| created_at | ISO 8601 UTC | |
| updated_at | ISO 8601 UTC | |

---

## 5. offers.csv

Buyer/Recycler offers on inventory lots or listings.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| lot_id | UUID | FK → inventory_lots.id (optional) |
| listing_id | UUID | FK → listings.id (optional) |
| buyer_id | UUID | FK → users.id (role=BUYER or RECYCLER) |
| offer_price | decimal | Price per kg/unit offered |
| quantity | decimal | Quantity requested |
| unit | enum | |
| transport_cost_estimate | decimal | Buyer's estimated transport cost |
| valid_until | ISO 8601 UTC | Offer expiry |
| status | enum | PENDING, ACCEPTED, REJECTED, WITHDRAWN, EXPIRED |
| note | string | Optional note |
| created_at | ISO 8601 UTC | |
| updated_at | ISO 8601 UTC | |

---

## 6. orders.csv

Orders created when an offer is accepted.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| offer_id | UUID | FK → offers.id |
| listing_id | UUID | FK → listings.id (optional) |
| lot_id | UUID | FK → inventory_lots.id (optional) |
| seller_id | UUID | FK → users.id |
| collector_id | UUID | FK → users.id (optional) |
| buyer_id | UUID | FK → users.id |
| recycler_id | UUID | FK → users.id (optional, for recycler orders) |
| quantity | decimal | |
| unit | enum | |
| agreed_price | decimal | Agreed price per kg/unit |
| status | enum | CREATED, CONFIRMED, HANDOVER_PENDING, COMPLETED, CANCELLED, DISPUTED |
| payment_status | enum | PENDING, PAID_DEMO, FAILED |
| scheduled_at | ISO 8601 UTC | |
| completed_at | ISO 8601 UTC | |
| notes | string | |
| created_at | ISO 8601 UTC | |
| updated_at | ISO 8601 UTC | |

---

## 7. transactions.csv

Financial transaction records (one per order completion).

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| order_id | UUID | FK → orders.id |
| transaction_type | enum | SALE, REFUND, ADJUSTMENT |
| amount | decimal | Total amount in currency |
| currency | string | INR (default) |
| status | enum | PENDING, COMPLETED, FAILED |
| recorded_at | ISO 8601 UTC | |
| reference | string | Receipt number or external reference |
| notes | string | |

---

## 8. payments.csv

Payment records (separated from order status).

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| order_id | UUID | FK → orders.id |
| payer_id | UUID | FK → users.id |
| payee_id | UUID | FK → users.id |
| amount | decimal | |
| currency | string | INR |
| method | enum | CASH_DEMO, UPI_DEMO, BANK_TRANSFER |
| status | enum | PENDING, COMPLETED, FAILED |
| external_reference | string | UTR / transaction ID |
| created_at | ISO 8601 UTC | |
| updated_at | ISO 8601 UTC | |

> [!NOTE]
> Payment status is separate from order completion status. An order can be COMPLETED
> (material handed over) while payment is still PENDING.

---

## 9. handover_records.csv

Records material handover between parties.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| order_id | UUID | FK → orders.id |
| handed_over_by | UUID | FK → users.id |
| received_by | UUID | FK → users.id |
| quantity | decimal | Actual quantity handed over |
| weight_kg | decimal | Actual weight |
| condition | string | Condition at handover |
| evidence_paths | JSON array | Photo evidence |
| notes | string | |
| confirmed_at | ISO 8601 UTC | When both parties confirmed |
| status | enum | PENDING, CONFIRMED, DISPUTED |

---

## 10. recycler_documents.csv

Compliance documents uploaded by Recyclers.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| recycler_id | UUID | FK → users.id (role=RECYCLER) |
| document_type | enum | PCB_LICENSE, GST_CERTIFICATE, POLLUTION_CLEARANCE, OTHER |
| file_path | string | Upload path |
| document_reference | string | License/certificate number |
| expiry_date | date | YYYY-MM-DD |
| verification_status | enum | PENDING, VERIFIED, REJECTED, EXPIRED |
| reviewed_by | UUID | FK → users.id (role=ADMIN) |
| reviewed_at | ISO 8601 UTC | |
| notes | string | |

> [!IMPORTANT]
> Uploading a document does NOT automatically grant authorized recycler status.
> Admin must explicitly verify each document.

---

## 11. notifications.csv

In-app notifications for all users.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → users.id |
| title | string | Short notification title |
| message | string | Full notification message |
| type | enum | OFFER, ORDER, PICKUP, SYSTEM, ALERT |
| related_entity_type | string | e.g. listing, offer, order |
| related_entity_id | UUID | FK to the related entity |
| read_at | ISO 8601 UTC | Null if unread |
| created_at | ISO 8601 UTC | |

---

## 12. support_tickets.csv

User-raised support requests and disputes.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → users.id |
| order_id | UUID | FK → orders.id (optional) |
| category | enum | WEIGHING_DISPUTE, PAYMENT, QUALITY, OTHER |
| subject | string | |
| description | string | |
| status | enum | OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| assigned_to | UUID | FK → users.id (admin) |
| resolution | string | Resolution notes |
| created_at | ISO 8601 UTC | |
| updated_at | ISO 8601 UTC | |

---

## 13. audit_log.csv

Immutable audit trail of sensitive actions.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| actor_id | UUID | FK → users.id (who did it) |
| action | string | e.g. user.suspended, offer.accepted |
| entity_type | string | e.g. user, listing, offer |
| entity_id | UUID | ID of affected entity |
| request_id | UUID | Trace ID for the HTTP request |
| ip_address | string | Requestor's IP |
| timestamp | ISO 8601 UTC | |
| outcome | enum | SUCCESS, FAILURE |
| details | JSON | Additional context (no secrets) |

---

## 14. app_settings.csv

Key-value configuration store.

| Column | Type | Description |
|---|---|---|
| key | string | Unique setting key |
| value | string | Setting value (JSON for complex values) |
| updated_at | ISO 8601 UTC | |
| updated_by | UUID | FK → users.id (admin who last updated) |

### Built-in Setting Keys

| Key | Description |
|---|---|
| indicative_rates | JSON array of rate cards |
| material_categories | JSON array of supported categories |
| max_upload_size_mb | Maximum file upload size |
| features_enabled | JSON object of feature flags |
| platform_version | Current platform version string |

