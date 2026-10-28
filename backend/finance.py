"""Pure calculations, shared by every page and tested without a running server."""

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
import numpy as np
from .models import State, Simulation


def cents(value):
    return int(Decimal(str(value)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def month_offset(d, offset):
    n = d.year * 12 + d.month - 1 + offset
    return date(n // 12, n % 12 + 1, 1)


def holding_value(h, cost=False):
    return cents(
        Decimal(str(h.shares)) * (h.purchase_price if cost else h.current_price)
    )


def summarize(s: State, month: str):
    balances = {
        a.id: a.opening_balance
        + sum(t.amount for t in s.transactions if t.account_id == a.id)
        for a in s.accounts
    }
    cash = sum(max(0, b) for b in balances.values())
    liabilities = -sum(min(0, b) for b in balances.values())
    invested = sum(holding_value(h) for h in s.holdings)
    cost = sum(holding_value(h, True) for h in s.holdings)
    txs = [t for t in s.transactions if t.date.isoformat().startswith(month)]
    income = sum(t.amount for t in txs if t.kind == "income")
    spending = -sum(t.amount for t in txs if t.kind == "expense")
    categories = defaultdict(int)
    for t in txs:
        if t.kind == "expense":
            categories[t.category] -= t.amount
    budgets = [
        {
            "id": b.id,
            "category": b.category,
            "planned": b.amount,
            "actual": categories[b.category],
            "fixed": b.fixed,
        }
        for b in s.budgets
        if b.month == month
    ]
    history = []
    today = date.today()
    for i in range(-5, 1):
        start = month_offset(today, i)
        end = min(month_offset(start, 1) - timedelta(days=1), today)
        eligible = [a for a in s.accounts if a.opened <= end]
        if not eligible:
            continue
        balance = sum(
            a.opening_balance
            + sum(
                t.amount
                for t in s.transactions
                if t.account_id == a.id and t.date <= end
            )
            for a in eligible
        )
        period = [
            t
            for t in s.transactions
            if t.date.year == start.year and t.date.month == start.month
        ]
        history.append(
            {
                "month": start.strftime("%b"),
                "date": end.isoformat(),
                "balance": balance / 100,
                "income": sum(t.amount for t in period if t.kind == "income") / 100,
                "spending": -sum(t.amount for t in period if t.kind == "expense") / 100,
            }
        )
    groups = defaultdict(list)
    for t in s.transactions:
        if t.kind == "expense":
            groups[t.merchant.strip().lower()].append(t)
    recurring = []
    for rows in groups.values():
        months = {t.date.strftime("%Y-%m") for t in rows}
        if len(months) < 2:
            continue
        # A recurring candidate appears once per month, with a stable amount.
        amounts = [-t.amount for t in rows]
        if len(rows) > len(months) * 1.25 or max(amounts) > min(amounts) * 1.2:
            continue
        last = max(rows, key=lambda t: t.date)
        if (today - last.date).days > 45:
            continue
        due = month_offset(last.date, 1).replace(day=min(last.date.day, 28))
        recurring.append(
            {
                "merchant": last.merchant,
                "amount": cents(sum(amounts) / len(amounts)),
                "last": last.date.isoformat(),
                "next": due.isoformat(),
                "category": last.category,
                "occurrences": len(rows),
            }
        )
    insights = []
    for b in budgets:
        if b["actual"] > b["planned"]:
            insights.append(
                {
                    "tone": "amber",
                    "title": f"{b['category']} is over plan",
                    "body": f"${(b['actual'] - b['planned']) / 100:,.2f} above your {month} budget.",
                    "page": "Budget Studio",
                }
            )
    if income:
        insights.append(
            {
                "tone": "mint",
                "title": f"You saved {(income - spending) / income:.0%} of income",
                "body": f"${(income - spending) / 100:,.2f} of income remains after recorded expenses this month.",
                "page": "Transactions",
            }
        )
    if s.holdings and invested:
        largest = max(s.holdings, key=holding_value)
        weight = holding_value(largest) / invested
        if weight > 0.4:
            insights.append(
                {
                    "tone": "blue",
                    "title": f"{largest.ticker} is {weight:.0%} of your portfolio",
                    "body": "Review concentration alongside your own diversification goals.",
                    "page": "Investments",
                }
            )
    return {
        "balances": balances,
        "cash": cash,
        "liabilities": liabilities,
        "invested": invested,
        "cost": cost,
        "net_worth": cash + invested - liabilities,
        "income": income,
        "spending": spending,
        "savings": income - spending,
        "savings_rate": (income - spending) / income * 100 if income else None,
        "categories": dict(sorted(categories.items(), key=lambda p: -p[1])),
        "budgets": budgets,
        "history": history,
        "recurring": sorted(recurring, key=lambda r: r["next"]),
        "insights": insights,
        "months": sorted(
            {t.date.strftime("%Y-%m") for t in s.transactions}
            | {today.strftime("%Y-%m")},
            reverse=True,
        ),
        "holdings": [
            dict(
                h.model_dump(mode="json"),
                value=holding_value(h),
                cost=holding_value(h, True),
            )
            for h in s.holdings
        ],
    }


def simulate(p: Simulation):
    """End-of-period contributions; effective annual returns; terminal gain tax.
    Monte Carlo uses independent monthly lognormal gross returns with specified
    annual arithmetic expectation and annual log volatility. No market forecast.
    """
    rng = np.random.default_rng(p.seed)
    paths = np.full(p.paths, p.initial, dtype=float)
    balance = p.initial
    contributions = p.initial
    rows = [
        {
            "year": 0,
            "value": balance,
            "real": balance,
            "contributions": contributions,
            "p10": balance,
            "p50": balance,
            "p90": balance,
            "savings": balance,
        }
    ]
    rate = ((1 + p.annual_return / 100) * (1 - p.fee / 100)) ** (1 / 12) - 1
    sigma = p.volatility / 100
    mu = np.log1p(p.annual_return / 100) - sigma * sigma / 2
    interval = {"monthly": 1, "quarterly": 3, "annually": 12}[p.frequency]
    for m in range(1, p.years * 12 + 1):
        contribution = (
            p.monthly * (1 + p.contribution_growth / 100) ** ((m - 1) // 12) * interval
            if m % interval == 0
            else 0
        )
        balance = balance * (1 + rate) + contribution
        paths = (
            paths
            * np.exp(rng.normal(mu / 12, sigma / np.sqrt(12), p.paths))
            * (1 - p.fee / 100) ** (1 / 12)
            + contribution
        )
        contributions += contribution
        if m % 12 == 0:
            after_tax = balance - max(0, balance - contributions) * p.tax / 100
            taxed = paths - np.maximum(0, paths - contributions) * p.tax / 100
            q = np.percentile(taxed, [10, 50, 90])
            rows.append(
                {
                    "year": m // 12,
                    "value": round(after_tax, 2),
                    "real": round(after_tax / (1 + p.inflation / 100) ** (m / 12), 2),
                    "contributions": round(contributions, 2),
                    "p10": round(float(q[0]), 2),
                    "p50": round(float(q[1]), 2),
                    "p90": round(float(q[2]), 2),
                    "savings": round(contributions, 2),
                }
            )
    taxed = paths - np.maximum(0, paths - contributions) * p.tax / 100
    counts, edges = np.histogram(taxed, bins=20)
    final = rows[-1]
    return {
        "rows": rows,
        "final": final,
        "probability": round(float(np.mean(taxed >= p.target) * 100), 1),
        "distribution": [
            {"value": round(float((edges[i] + edges[i + 1]) / 2), 2), "count": int(n)}
            for i, n in enumerate(counts)
        ],
        "growth": round(final["value"] - contributions, 2),
        "paths": p.paths,
        "seed": p.seed,
    }
