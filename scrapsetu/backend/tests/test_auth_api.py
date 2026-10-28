from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from jose import jwt
from app.config import settings
from app.main import app
from app.security.dependencies import _login_attempts
from app.services.auth_service import seed_admin_user
from app.storage.storage_factory import clear_repository_cache, get_repository


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "JWT_SECRET", "test-only-secret-which-is-at-least-32-characters")
    monkeypatch.setattr(settings, "CSV_DATA_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "ADMIN_SEED_EMAIL", "")
    monkeypatch.setattr(settings, "ADMIN_SEED_PASSWORD", "")
    _login_attempts.clear()
    clear_repository_cache()
    with TestClient(app) as test_client:
        yield test_client
    _login_attempts.clear()
    clear_repository_cache()


def register_payload(role="SELLER", **overrides):
    payload = {
        "full_name": "Test User",
        "email": "test@example.com",
        "phone": "+919876543210",
        "password": "ScrapSetu1",
        "role": role,
        "city": "Delhi",
        "locality": "Central",
        "preferred_language": "en",
    }
    payload.update(overrides)
    return payload


def authorization_headers(client, role, email, phone):
    payload = register_payload(role=role, email=email, phone=phone)
    assert client.post("/api/auth/register", json=payload).status_code == 201
    login = client.post("/api/auth/login", json={
        "email": email,
        "password": payload["password"],
    })
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.mark.parametrize("role", ["SELLER", "COLLECTOR", "BUYER", "RECYCLER"])
def test_permitted_roles_register_and_login(client, role):
    response = client.post("/api/auth/register", json=register_payload(role=role))
    assert response.status_code == 201
    assert response.json()["role"] == role
    assert "password_hash" not in response.json()

    login = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "ScrapSetu1",
    })
    assert login.status_code == 200
    assert login.json()["role"] == role
    assert "refresh_token" not in login.json()
    assert "scrapsetu_refresh" in login.cookies
    assert login.headers["set-cookie"].lower().find("httponly") >= 0
    assert "samesite=strict" in login.headers["set-cookie"].lower()


def test_admin_cannot_register_publicly(client):
    response = client.post("/api/auth/register", json=register_payload(role="ADMIN"))
    assert response.status_code == 422


def test_securely_seeded_admin_can_login(client):
    seed_admin_user("admin@example.com", "AdminPassword1")
    response = client.post("/api/auth/login", json={
        "email": "admin@example.com",
        "password": "AdminPassword1",
    })
    assert response.status_code == 200
    assert response.json()["role"] == "ADMIN"


def test_duplicate_email_and_phone_are_rejected(client):
    assert client.post("/api/auth/register", json=register_payload()).status_code == 201
    duplicate_email = client.post(
        "/api/auth/register",
        json=register_payload(phone="+919876543211"),
    )
    duplicate_phone = client.post(
        "/api/auth/register",
        json=register_payload(email="other@example.com"),
    )
    assert duplicate_email.status_code == 409
    assert duplicate_phone.status_code == 409


def test_invalid_password_and_suspended_account_are_rejected(client):
    bad_login = client.post("/api/auth/login", json={
        "email": "nobody@example.com",
        "password": "wrong",
    })
    assert bad_login.status_code == 401

    client.post("/api/auth/register", json=register_payload())
    users = get_repository("users")
    user = users.find_one({"email": "test@example.com"})
    assert user
    users.update(user["id"], {"account_status": "SUSPENDED"})
    suspended = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "ScrapSetu1",
    })
    assert suspended.status_code == 403


def test_session_restore_protected_profile_and_logout(client):
    client.post("/api/auth/register", json=register_payload())
    login = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "ScrapSetu1",
    })
    access_token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    assert client.get("/api/auth/me", headers=headers).status_code == 200
    refreshed = client.post("/api/auth/refresh")
    assert refreshed.status_code == 200
    assert "access_token" in refreshed.json()
    assert client.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/logout").status_code == 204
    assert client.post("/api/auth/refresh").status_code == 401


def test_registration_validation_and_invalid_token(client):
    invalid = client.post(
        "/api/auth/register",
        json=register_payload(password="weak"),
    )
    assert invalid.status_code == 422
    assert client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    ).status_code == 401
    too_long_login = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "A1" + "x" * 71,
    })
    assert too_long_login.status_code == 422


def test_expired_refresh_token_is_rejected(client):
    expired = jwt.encode(
        {
            "sub": "missing-user",
            "type": "refresh",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    response = client.post("/api/auth/refresh", json={"refresh_token": expired})
    assert response.status_code == 401


def test_marketplace_offer_acceptance_and_settlement_are_persisted(client):
    seller_headers = authorization_headers(
        client, "SELLER", "seller@example.com", "+919876543210",
    )
    collector_headers = authorization_headers(
        client, "COLLECTOR", "collector@example.com", "+919876543211",
    )
    listing_response = client.post("/api/listings", headers=seller_headers, json={
        "title": "Sorted newspaper",
        "material_category": "paper",
        "subcategory": "Newspaper",
        "condition": "clean_sorted",
        "quantity": 20,
        "estimated_weight_kg": 20,
        "pickup_address": "1 Test Street",
        "city": "Delhi",
        "locality": "Central",
    })
    assert listing_response.status_code == 201
    listing_id = listing_response.json()["id"]

    collector_feed = client.get("/api/listings", headers=collector_headers)
    assert collector_feed.status_code == 200
    assert [item["id"] for item in collector_feed.json()] == [listing_id]

    offer_response = client.post("/api/offers", headers=collector_headers, json={
        "listing_id": listing_id,
        "offered_rate_per_kg": 12.5,
        "proposed_pickup_time": "Tomorrow 10:00",
        "note": "Digital scale.",
    })
    assert offer_response.status_code == 201
    offer_id = offer_response.json()["id"]

    accepted = client.post(f"/api/offers/{offer_id}/accept", headers=seller_headers)
    assert accepted.status_code == 200
    order_id = accepted.json()["id"]
    assert accepted.json()["status"] == "confirmed"

    settled = client.post(f"/api/orders/{order_id}/settle", headers=collector_headers, json={
        "actual_weight_kg": 18.5,
        "payment_status": "paid_upi_demo",
        "transaction_notes": "UPI paid at pickup.",
    })
    assert settled.status_code == 200
    assert settled.json()["status"] == "completed"
    assert settled.json()["final_amount"] == 231.25

    persisted_orders = client.get("/api/orders", headers=seller_headers)
    assert persisted_orders.status_code == 200
    assert persisted_orders.json()[0]["id"] == order_id
    assert persisted_orders.json()[0]["actual_weight_kg"] == 18.5
    inventory = client.get("/api/inventory", headers=collector_headers)
    assert inventory.status_code == 200
    assert inventory.json()[0]["weight_kg"] == "18.5"
    seller_profile = client.get("/api/auth/me", headers=seller_headers).json()
    collector_profile = client.get("/api/auth/me", headers=collector_headers).json()
    assert seller_profile["green_score_kg"] == "18.5"
    assert seller_profile["completed_transactions"] == "1"
    assert collector_profile["completed_transactions"] == "1"


def test_marketplace_rejects_cross_role_and_cross_owner_actions(client):
    seller_headers = authorization_headers(
        client, "SELLER", "owner@example.com", "+919876543210",
    )
    other_seller_headers = authorization_headers(
        client, "SELLER", "other@example.com", "+919876543211",
    )
    buyer_headers = authorization_headers(
        client, "BUYER", "buyer@example.com", "+919876543212",
    )
    other_buyer_headers = authorization_headers(
        client, "BUYER", "other-buyer@example.com", "+919876543213",
    )
    listing_response = client.post("/api/listings", headers=seller_headers, json={
        "title": "Cardboard",
        "material_category": "cardboard",
        "subcategory": "Cartons",
        "condition": "clean_sorted",
        "quantity": 10,
        "estimated_weight_kg": 10,
        "pickup_address": "1 Test Street",
        "city": "Delhi",
    })
    listing_id = listing_response.json()["id"]
    assert client.delete(f"/api/listings/{listing_id}", headers=other_seller_headers).status_code == 403

    own_offer = client.post("/api/offers", headers=buyer_headers, json={
        "listing_id": listing_id,
        "offered_rate_per_kg": 10,
        "proposed_pickup_time": "Tomorrow",
    })
    assert own_offer.status_code == 201
    assert client.post(
        f"/api/offers/{own_offer.json()['id']}/accept",
        headers=other_seller_headers,
    ).status_code == 403

    accepted = client.post(
        f"/api/offers/{own_offer.json()['id']}/accept",
        headers=seller_headers,
    )
    assert accepted.status_code == 200
    buyer_order_settlement = client.post(f"/api/orders/{accepted.json()['id']}/settle", headers=other_buyer_headers, json={
        "actual_weight_kg": 10,
        "payment_status": "paid_cash_demo",
    })
    assert buyer_order_settlement.status_code == 403
    assigned_settlement = client.post(
        f"/api/orders/{accepted.json()['id']}/settle",
        headers=buyer_headers,
        json={"actual_weight_kg": 10, "payment_status": "paid_cash_demo"},
    )
    assert assigned_settlement.status_code == 200
    assert assigned_settlement.json()["status"] == "completed"


def test_recycler_orders_are_returned_to_the_assigned_recycler(client):
    seller_headers = authorization_headers(
        client, "SELLER", "recycler-seller@example.com", "+919876543210",
    )
    recycler_headers = authorization_headers(
        client, "RECYCLER", "recycler@example.com", "+919876543211",
    )
    listing = client.post("/api/listings", headers=seller_headers, json={
        "title": "Sorted plastic",
        "material_category": "plastic",
        "subcategory": "PET",
        "condition": "clean_sorted",
        "quantity": 15,
        "estimated_weight_kg": 15,
        "pickup_address": "1 Test Street",
        "city": "Delhi",
    })
    assert listing.status_code == 201
    offer = client.post("/api/offers", headers=recycler_headers, json={
        "listing_id": listing.json()["id"],
        "offered_rate_per_kg": 20,
        "proposed_pickup_time": "Tomorrow",
    })
    assert offer.status_code == 201
    accepted = client.post(
        f"/api/offers/{offer.json()['id']}/accept",
        headers=seller_headers,
    )
    assert accepted.status_code == 200

    recycler_profile = client.get("/api/auth/me", headers=recycler_headers).json()
    recycler_orders = client.get("/api/orders", headers=recycler_headers)
    assert recycler_orders.status_code == 200
    assert recycler_orders.json()[0]["buyer_id"] == recycler_profile["id"]
    settled = client.post(
        f"/api/orders/{accepted.json()['id']}/settle",
        headers=recycler_headers,
        json={"actual_weight_kg": 14, "payment_status": "paid_upi_demo"},
    )
    assert settled.status_code == 200
