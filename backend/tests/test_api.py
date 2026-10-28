from fastapi.testclient import TestClient
from backend.main import app, Base, engine
import pytest


@pytest.fixture(autouse=True)
def fresh_database():
    Base.metadata.drop_all(engine)


def test_workspace_isolation_crud_and_stale_revision():
    with TestClient(app) as client:
        personal = client.get("/api/state?workspace=personal").json()["state"]
        demo = client.get("/api/state?workspace=demo").json()["state"]
        assert len(demo["transactions"]) > 100 and personal["transactions"] == []
        item = {
            "id": "a",
            "name": "Test",
            "kind": "checking",
            "opening_balance": 10000,
            "opened": "2026-01-01",
        }
        r = client.put(
            "/api/entities/accounts?workspace=personal",
            json={"revision": personal["revision"], "item": item},
        )
        assert r.status_code == 200
        stale = client.put(
            "/api/entities/accounts?workspace=personal",
            json={"revision": personal["revision"], "item": item},
        )
        assert stale.status_code == 409
        assert len(
            client.get("/api/state?workspace=demo").json()["state"]["accounts"]
        ) == len(demo["accounts"])


def test_csv_atomic_commit_and_export_restore_roundtrip():
    with TestClient(app) as client:
        state = client.get("/api/state?workspace=personal").json()["state"]
        client.put(
            "/api/entities/accounts?workspace=personal",
            json={
                "revision": state["revision"],
                "item": {
                    "id": "a",
                    "name": "Test",
                    "kind": "checking",
                    "opening_balance": 0,
                    "opened": "2026-01-01",
                },
            },
        )
        state = client.get("/api/state?workspace=personal").json()["state"]
        body = {
            "revision": state["revision"],
            "filename": "test.csv",
            "account_id": "a",
            "rows": [{"d": "bad-date", "m": "Shop", "v": "-12.00"}],
            "mapping": {"date": "d", "merchant": "m", "amount": "v"},
        }
        r = client.post("/api/csv/commit?workspace=personal", json=body)
        assert r.status_code == 422
        assert (
            client.get("/api/state?workspace=personal").json()["state"]["revision"]
            == state["revision"]
        )
        body["rows"][0]["d"] = "2026-01-02"
        assert (
            client.post("/api/csv/commit?workspace=personal", json=body).json()[
                "imported"
            ]
            == 1
        )
        exported = client.get("/api/export?workspace=personal").json()
        assert len(exported["transactions"]) == 1
        assert (
            client.delete(
                f"/api/entities/accounts/a?workspace=personal&revision={exported['revision']}"
            ).status_code
            == 422
        )
        restored = client.put(
            "/api/restore?workspace=personal",
            json={"revision": exported["revision"], "state": exported},
        )
        assert restored.status_code == 200
        assert restored.json()["revision"] == exported["revision"] + 1


def test_cross_origin_mutations_and_dns_rebinding_blocked():
    with TestClient(app) as client:
        assert (
            client.get("/api/state", headers={"host": "evil.example"}).status_code
            == 403
        )
        assert (
            client.post(
                "/api/reset-demo",
                headers={"origin": "https://evil.example"},
                json={"revision": 0},
            ).status_code
            == 403
        )


def test_csv_inspection_detects_delimiter_and_keeps_all_rows():
    with TestClient(app) as client:
        r = client.post(
            "/api/csv/inspect",
            files={
                "file": (
                    "test.csv",
                    "date;description;amount\n2026-01-01;Shop;-2.00\n",
                    "text/csv",
                )
            },
        )
        assert (
            r.status_code == 200
            and r.json()["delimiter"] == ";"
            and r.json()["count"] == 1
        )


def test_chat_uses_saved_data_and_never_mutates():
    with TestClient(app) as client:
        before = client.get("/api/state?workspace=demo").json()["state"]
        r = client.post(
            "/api/chat?workspace=demo",
            json={"message": "Explain my budget", "month": "2026-10"},
        )
        assert r.status_code == 200 and "recorded" in r.json()["answer"].lower()
        assert (
            client.get("/api/state?workspace=demo").json()["state"]["revision"]
            == before["revision"]
        )
