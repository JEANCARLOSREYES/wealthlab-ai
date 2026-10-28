from datetime import date
import pytest
from backend.models import State, Simulation
from backend.finance import summarize, simulate, holding_value
from backend.main import parse_money, preview_csv, CSVPreview
from backend.performance import performance


def state_with_transfers():
    return State.model_validate(
        {
            "accounts": [
                {
                    "id": "cash",
                    "name": "Cash",
                    "kind": "checking",
                    "opening_balance": 100000,
                    "opened": "2026-01-01",
                },
                {
                    "id": "card",
                    "name": "Card",
                    "kind": "credit",
                    "opening_balance": -20000,
                    "opened": "2026-01-01",
                },
            ],
            "transactions": [
                {
                    "id": "salary",
                    "account_id": "cash",
                    "date": "2026-01-02",
                    "merchant": "Payroll",
                    "amount": 100000,
                    "kind": "income",
                    "category": "Salary",
                },
                {
                    "id": "buy",
                    "account_id": "card",
                    "date": "2026-01-03",
                    "merchant": "Shop",
                    "amount": -5000,
                    "kind": "expense",
                    "category": "Shopping",
                },
                {
                    "id": "pay-out",
                    "account_id": "cash",
                    "date": "2026-01-04",
                    "merchant": "Card payment",
                    "amount": -25000,
                    "kind": "transfer",
                    "category": "Transfer",
                },
                {
                    "id": "pay-in",
                    "account_id": "card",
                    "date": "2026-01-04",
                    "merchant": "Card payment",
                    "amount": 25000,
                    "kind": "transfer",
                    "category": "Transfer",
                },
            ],
        }
    )


def test_transfers_never_double_count_card_spending():
    m = summarize(state_with_transfers(), "2026-01")
    assert m["income"] == 100000
    assert m["spending"] == 5000
    assert m["savings"] == 95000
    assert m["net_worth"] == 175000
    assert m["liabilities"] == 0


def test_zero_return_simulation_conserves_contributions():
    r = simulate(
        Simulation(
            initial=1000,
            monthly=100,
            years=2,
            annual_return=0,
            fee=0,
            inflation=0,
            volatility=0,
            contribution_growth=0,
            tax=0,
        )
    )
    assert r["final"]["value"] == 3400
    assert r["final"]["contributions"] == 3400
    assert r["final"]["p10"] == r["final"]["p50"] == r["final"]["p90"] == 3400
    assert r["growth"] == 0


def test_lump_sum_effective_annual_return():
    r = simulate(
        Simulation(
            initial=1000,
            monthly=0,
            years=2,
            annual_return=10,
            fee=0,
            inflation=0,
            volatility=0,
        )
    )
    assert r["final"]["value"] == 1210


def test_terminal_tax_only_on_gains_and_real_dollars():
    r = simulate(
        Simulation(
            initial=1000,
            monthly=0,
            years=1,
            annual_return=10,
            fee=0,
            inflation=10,
            tax=20,
            volatility=0,
        )
    )
    assert r["final"]["value"] == 1080
    assert r["final"]["real"] == 981.82
    assert r["final"]["p50"] == 1080


def test_quarterly_end_period_and_growth():
    r = simulate(
        Simulation(
            initial=0,
            monthly=100,
            years=2,
            annual_return=0,
            fee=0,
            inflation=0,
            volatility=0,
            frequency="quarterly",
            contribution_growth=10,
        )
    )
    assert r["final"]["contributions"] == 2520
    assert r["final"]["value"] == 2520


def test_same_seed_reproduces_simulation():
    assert simulate(Simulation(seed=16)) == simulate(Simulation(seed=16))


def test_money_parsing_parentheses_currency_and_rounding():
    assert parse_money("($1,234.56)") == -123456
    assert parse_money("1.005") == 101
    for value in ["NaN", "Inf", "bad"]:
        with pytest.raises(ValueError):
            parse_money(value)


def test_duplicate_csv_rows_and_existing_records():
    s = state_with_transfers()
    body = CSVPreview(
        account_id="cash",
        mapping={"date": "date", "merchant": "description", "amount": "amount"},
        rows=[
            {"date": "2026-01-02", "description": "Payroll", "amount": "1000.00"},
            {"date": "2026-01-05", "description": "New purchase", "amount": "-12.34"},
            {"date": "2026-01-05", "description": "New purchase", "amount": "-12.34"},
        ],
    )
    r = preview_csv(body, s)
    assert r["duplicates"] == 2 and r["valid"] == 1 and not r["errors"]


def test_debit_credit_and_transfer_rules():
    s = State.model_validate(
        {
            **state_with_transfers().model_dump(mode="json"),
            "rules": [
                {
                    "id": "r",
                    "contains": "card payment",
                    "category": "Transfer",
                    "kind": "transfer",
                }
            ],
        }
    )
    r = preview_csv(
        CSVPreview(
            account_id="cash",
            mapping={
                "date": "date",
                "merchant": "merchant",
                "debit": "debit",
                "credit": "credit",
            },
            rows=[
                {
                    "date": "2026-01-05",
                    "merchant": "Card payment",
                    "debit": "250.00",
                    "credit": "",
                }
            ],
        ),
        s,
    )
    assert r["rows"][0]["item"]["kind"] == "transfer"
    assert r["rows"][0]["item"]["amount"] == -25000


def test_csv_errors_are_explicit_and_date_formats_selectable():
    body = CSVPreview(
        account_id="cash",
        date_format="%d/%m/%Y",
        mapping={"date": "d", "merchant": "m", "amount": "a"},
        rows=[
            {"d": "31/01/2026", "m": "Shop", "a": "-5"},
            {"d": "garbage", "m": "Shop", "a": "-5"},
        ],
    )
    r = preview_csv(body, state_with_transfers())
    assert r["rows"][0]["item"]["date"] == "2026-01-31"
    assert len(r["errors"]) == 1 and r["errors"][0]["row"] == 3


def test_empty_workspace_has_no_fabricated_history():
    m = summarize(State(), "2026-01")
    assert m["history"] == [] and m["net_worth"] == 0 and m["savings_rate"] is None


def test_transaction_before_opening_rejected():
    raw = state_with_transfers().model_dump(mode="json")
    raw["transactions"][0]["date"] = "2025-01-01"
    with pytest.raises(ValueError):
        State.model_validate(raw)


def test_return_methods_exclude_contributions():
    s = State.model_validate(
        {
            "checkpoints": [
                {"id": "p1", "date": "2025-01-01", "value": 100000, "flow": 0},
                {"id": "p2", "date": "2026-01-01", "value": 210000, "flow": 100000},
            ]
        }
    )
    p = performance(s)
    assert p["twr"] == pytest.approx(10)
    assert p["mwr"] == pytest.approx(10, abs=1e-5)


def test_zero_investment_gain_with_deposit_yields_zero_return():
    s = State.model_validate(
        {
            "checkpoints": [
                {"id": "p1", "date": "2025-01-01", "value": 100000, "flow": 0},
                {"id": "p2", "date": "2026-01-01", "value": 200000, "flow": 100000},
            ]
        }
    )
    p = performance(s)
    assert p["twr"] == pytest.approx(0)
    assert p["mwr"] == pytest.approx(0, abs=1e-5)


def test_price_csv_deduplication():
    s = State.model_validate(
        {
            "prices": [
                {"id": "p", "ticker": "TEST", "date": "2026-01-01", "price": 10000}
            ]
        }
    )
    p = preview_csv(
        CSVPreview(
            mode="prices",
            mapping={"ticker": "t", "date": "d", "price": "p"},
            rows=[{"t": "test", "d": "2026-01-01", "p": "101"}],
        ),
        s,
    )
    assert p["duplicates"] == 1 and p["valid"] == 0
