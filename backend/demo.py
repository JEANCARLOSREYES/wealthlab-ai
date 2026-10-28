"""Repeatable fictional demo; personal data is always a separate workspace."""

from datetime import date, timedelta
import random
from .finance import month_offset
from .models import State


def demo_state():
    today = date.today()
    start = month_offset(today, -5)
    rng = random.Random(17)
    accounts = [
        {
            "id": "checking",
            "name": "Everyday checking",
            "kind": "checking",
            "opening_balance": 1360000,
            "opened": str(start),
            "institution": "Demo · checking",
        },
        {
            "id": "savings",
            "name": "High-yield savings",
            "kind": "savings",
            "opening_balance": 1860000,
            "opened": str(start),
            "institution": "Demo · savings",
        },
        {
            "id": "credit",
            "name": "Everyday credit card",
            "kind": "credit",
            "opening_balance": -62000,
            "opened": str(start),
            "institution": "Demo · credit",
        },
    ]
    tx = []

    def add(day, merchant, amount, category, kind="expense", account="checking"):
        if day <= today:
            tx.append(
                {
                    "id": f"demo-{len(tx)}",
                    "account_id": account,
                    "date": str(day),
                    "merchant": merchant,
                    "amount": amount,
                    "kind": kind,
                    "category": category,
                    "note": "",
                }
            )

    for off in range(6):
        m = month_offset(start, off)
        for day in [1, 15]:
            add(
                m.replace(day=day),
                "Northstar Studio · payroll",
                320000,
                "Salary",
                "income",
            )
        for day, name, amount, cat in [
            (2, "Willow Apartments", -165000, "Housing"),
            (5, "Internet service", -6500, "Utilities"),
            (7, "Spotify", -1199, "Subscriptions"),
            (9, "Electric company", -11200, "Utilities"),
            (11, "Gym membership", -4500, "Health"),
            (18, "Netflix", -1549, "Subscriptions"),
            (22, "Phone plan", -5500, "Utilities"),
        ]:
            add(m.replace(day=day), name, amount, cat)
        for day in [3, 10, 17, 24]:
            add(
                m.replace(day=day),
                "Whole Foods Market",
                -rng.randint(7800, 14500),
                "Groceries",
            )
            add(
                m.replace(day=min(day + 1, 28)),
                "Neighborhood coffee",
                -rng.randint(650, 1450),
                "Dining",
            )
        for day in [6, 13, 20, 27]:
            add(
                m.replace(day=day),
                rng.choice(["Sweetgreen", "Local kitchen", "Weekend brunch"]),
                -rng.randint(2400, 5600),
                "Dining",
            )
        for day in [8, 19]:
            add(
                m.replace(day=day),
                "City transit",
                -rng.randint(2500, 4700),
                "Transport",
            )
        add(m.replace(day=12), "Target", -rng.randint(10500, 28000), "Shopping")
        add(m.replace(day=16), "Bookshop", -rng.randint(2300, 5200), "Lifestyle")
        add(m.replace(day=21), "Savings contribution", -80000, "Transfer", "transfer")
        add(
            m.replace(day=21),
            "Savings contribution",
            80000,
            "Transfer",
            "transfer",
            "savings",
        )
        add(m.replace(day=23), "Card payment", -20000, "Transfer", "transfer")
        add(m.replace(day=23), "Card payment", 20000, "Transfer", "transfer", "credit")
        add(
            m.replace(day=14),
            "Online shopping",
            -18000,
            "Shopping",
            "expense",
            "credit",
        )
    month = today.strftime("%Y-%m")
    budgets = [
        {
            "id": f"b-{i}",
            "category": cat,
            "amount": v,
            "month": month,
            "fixed": cat in ["Housing", "Utilities", "Subscriptions"],
        }
        for i, (cat, v) in enumerate(
            [
                ("Housing", 165000),
                ("Groceries", 45000),
                ("Dining", 18000),
                ("Shopping", 32000),
                ("Utilities", 25000),
                ("Transport", 10000),
                ("Subscriptions", 3000),
                ("Health", 8000),
                ("Lifestyle", 10000),
            ]
        )
    ]
    holdings = [
        {
            "id": f"h-{i}",
            "name": name,
            "ticker": ticker,
            "asset_class": cls,
            "shares": shares,
            "purchase_price": cost,
            "current_price": price,
            "purchased": str(start),
            "valued": str(today),
        }
        for i, (name, ticker, cls, shares, cost, price) in enumerate(
            [
                ("Total US Stock Market", "VTI", "US equities", 90, 24000, 27145),
                (
                    "Total International Stock",
                    "VXUS",
                    "International equities",
                    150,
                    5800,
                    6340,
                ),
                ("Total Bond Market", "BND", "Bonds", 100, 7100, 7342),
                ("Real Estate ETF", "VNQ", "Real estate", 50, 8200, 8920),
            ]
        )
    ]
    # Fictional price observations and end-of-day return checkpoints.
    # Anchor the last portfolio checkpoint to the saved demo holding value.
    portfolio = sum(round(h["shares"] * h["current_price"]) for h in holdings)
    checkpoints = []
    values = [portfolio]
    for _ in range(5):
        values.insert(0, round((values[0] - 50000) / 1.01))
    for i, value in enumerate(values):
        stamp = month_offset(start, i).replace(day=min(28, today.day))
        checkpoints.append(
            {
                "id": f"checkpoint-{i}",
                "date": str(stamp),
                "value": value,
                "flow": 50000 if i else 0,
            }
        )
    prices = [
        {
            "id": f"price-{i}-{h['ticker']}",
            "ticker": h["ticker"],
            "date": str(month_offset(start, i).replace(day=min(28, today.day))),
            "price": round(h["current_price"] * (0.94 + 0.012 * i)),
        }
        for h in holdings
        for i in range(6)
    ]
    return State.model_validate(
        {
            "prices": prices,
            "checkpoints": checkpoints,
            "accounts": accounts,
            "transactions": tx,
            "budgets": budgets,
            "holdings": holdings,
            "goals": [
                {
                    "id": "g1",
                    "name": "Emergency fund",
                    "target": 3000000,
                    "saved": 2100000,
                    "monthly": 80000,
                    "deadline": str(today + timedelta(days=365)),
                    "color": "mint",
                },
                {
                    "id": "g2",
                    "name": "A place of my own",
                    "target": 6000000,
                    "saved": 1540000,
                    "monthly": 60000,
                    "deadline": str(today + timedelta(days=365 * 4)),
                    "color": "blue",
                },
                {
                    "id": "g3",
                    "name": "Japan, here I come",
                    "target": 500000,
                    "saved": 325000,
                    "monthly": 25000,
                    "deadline": str(today + timedelta(days=240)),
                    "color": "violet",
                },
            ],
            "notes": [
                {
                    "id": "n1",
                    "title": "My investing principles",
                    "body": "Keep costs low. Diversify across markets. Invest consistently.\n\nBefore buying: write down the time horizon, the risk I can tolerate, and why the asset belongs in my plan. Revisit the plan before reacting to headlines.",
                    "tag": "Investment thesis",
                    "updated": str(today),
                    "pinned": True,
                },
                {
                    "id": "n2",
                    "title": "Monthly money review",
                    "body": "1. Review unusual transactions.\n2. Check category budgets.\n3. Update manually supplied investment prices.\n4. Revisit goal contributions.\n5. Export a backup.",
                    "tag": "Checklist",
                    "updated": str(today),
                    "pinned": False,
                },
            ],
            "rules": [
                {
                    "id": "r1",
                    "contains": "payroll",
                    "category": "Salary",
                    "kind": "income",
                },
                {
                    "id": "r2",
                    "contains": "card payment",
                    "category": "Transfer",
                    "kind": "transfer",
                },
                {
                    "id": "r3",
                    "contains": "whole foods",
                    "category": "Groceries",
                    "kind": "expense",
                },
            ],
        }
    )
