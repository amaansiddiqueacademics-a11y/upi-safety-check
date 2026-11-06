"""App wiring: health, CORS and the rate limiter."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_removed_consumer_endpoints_are_gone(client):
    for path in ("/api/triage", "/api/extract", "/api/numbers/check", "/api/reference/handles"):
        assert client.get(path).status_code in (404, 405)


def test_cors_allows_the_dev_frontend_only(client):
    ok = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    other = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in other.headers


def test_rate_limit_on_uploads(client, monkeypatch):
    from app import main

    monkeypatch.delenv("DISABLE_RATE_LIMIT", raising=False)
    main._hits.clear()
    bad = {"transactions": ("t.csv", b"a,b\n1,2\n", "text/csv")}
    codes = [client.post("/api/merchant/datasets", files=bad).status_code for _ in range(main.LIMITS["/api/merchant/datasets"] + 1)]
    assert codes[:-1] == [422] * main.LIMITS["/api/merchant/datasets"] and codes[-1] == 429
    main._hits.clear()


def test_rupees_use_indian_grouping():
    from app.merchant.reconcile import inr

    assert inr(733407335) == "₹73,34,073.35"
    assert inr(30736900) == "₹3,07,369"
    assert inr(99) == "₹0.99" and inr(-245000) == "-₹2,450"


def test_fraud_headline_never_claims_certainty(client):
    sure = {"amount": 284.1, "hour": 2, "customer_prior_payments": 1, "customer_usual_amount": 5.68, "hours_since_last_payment": 0.5,
            "payments_last_hour": 3, "payments_last_24h": 3, "account_age_days": 3, "new_device": True, "accounts_on_device_7d": 4,
            "distance_km": 900, "email_domain": "anonymous.com"}
    calm = {"amount": 11.36, "hour": 15, "customer_prior_payments": 5, "customer_usual_amount": 9.09, "hours_since_last_payment": 72,
            "account_age_days": 500, "accounts_on_device_7d": 1, "distance_km": 5}
    for body in (sure, calm):
        h = client.post("/api/fraud/score", json=body).json()["headline"]
        assert "100%" not in h and " 0.0%" not in h and ". about" not in h, h
