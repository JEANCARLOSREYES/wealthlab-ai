"""Validated data contracts. Money is always integer cents, never binary floats."""

from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator


class Record(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=80)


class Account(Record):
    name: str = Field(min_length=1, max_length=100)
    kind: Literal["checking", "savings", "cash", "credit", "loan"] = "checking"
    opening_balance: int = Field(ge=-100_000_000_000, le=100_000_000_000)
    opened: date
    institution: str = Field(default="Manual account", max_length=100)


class Transaction(Record):
    account_id: str
    date: date
    merchant: str = Field(min_length=1, max_length=200)
    amount: int = Field(ge=-100_000_000_000, le=100_000_000_000)
    kind: Literal["income", "expense", "transfer"]
    category: str = Field(min_length=1, max_length=80)
    note: str = Field(default="", max_length=2000)

    @model_validator(mode="after")
    def signs(self):
        if self.kind == "income" and self.amount <= 0:
            raise ValueError("Income must be positive.")
        if self.kind == "expense" and self.amount >= 0:
            raise ValueError("Expenses must be negative.")
        if self.date > date.today():
            raise ValueError("Future transactions belong in a plan, not your ledger.")
        return self


class Budget(Record):
    category: str = Field(min_length=1, max_length=80)
    amount: int = Field(ge=0, le=100_000_000_000)
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    fixed: bool = False


class Holding(Record):
    name: str = Field(min_length=1, max_length=100)
    ticker: str = Field(min_length=1, max_length=20)
    asset_class: Literal[
        "US equities",
        "International equities",
        "Bonds",
        "Real estate",
        "Crypto",
        "Cash",
        "Other",
    ]
    shares: float = Field(gt=0, le=1e9, allow_inf_nan=False)
    purchase_price: int = Field(ge=0, le=1e10)
    current_price: int = Field(ge=0, le=1e10)
    purchased: date
    valued: date

    @model_validator(mode="after")
    def dates(self):
        if self.purchased > self.valued or self.valued > date.today():
            raise ValueError(
                "Purchase date must precede valuation date; neither can be in the future."
            )
        return self


class Price(Record):
    ticker: str = Field(min_length=1, max_length=20)
    date: date
    price: int = Field(ge=0, le=10_000_000_000)

    @model_validator(mode="after")
    def not_future(self):
        if self.date > date.today():
            raise ValueError("Historical price date cannot be in the future.")
        return self


class Checkpoint(Record):
    date: date
    value: int = Field(gt=0, le=100_000_000_000)
    flow: int = Field(default=0, ge=-100_000_000_000, le=100_000_000_000)

    @model_validator(mode="after")
    def valid(self):
        if self.date > date.today():
            raise ValueError("Checkpoint cannot be in the future.")
        if self.value - self.flow < 0:
            raise ValueError(
                "End value cannot be less than the end-of-day contribution."
            )
        return self


class Goal(Record):
    name: str = Field(min_length=1, max_length=100)
    target: int = Field(gt=0, le=100_000_000_000)
    saved: int = Field(ge=0, le=100_000_000_000)
    monthly: int = Field(ge=0, le=100_000_000_000)
    deadline: date
    color: str = Field(default="mint", pattern="^(mint|blue|violet|amber)$")


class Note(Record):
    title: str = Field(min_length=1, max_length=150)
    body: str = Field(max_length=20000)
    tag: str = Field(default="Research", max_length=50)
    updated: date
    pinned: bool = False


class Rule(Record):
    contains: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=80)
    kind: Literal["income", "expense", "transfer"]


class Scenario(Record):
    name: str = Field(min_length=1, max_length=100)
    inputs: dict


class State(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    revision: int = 0
    accounts: list[Account] = Field(default_factory=list, max_length=500)
    transactions: list[Transaction] = Field(default_factory=list, max_length=50000)
    budgets: list[Budget] = Field(default_factory=list, max_length=5000)
    holdings: list[Holding] = Field(default_factory=list, max_length=5000)
    prices: list[Price] = Field(default_factory=list, max_length=50000)
    checkpoints: list[Checkpoint] = Field(default_factory=list, max_length=5000)
    goals: list[Goal] = Field(default_factory=list, max_length=500)
    notes: list[Note] = Field(default_factory=list, max_length=5000)
    rules: list[Rule] = Field(default_factory=list, max_length=500)
    scenarios: list[Scenario] = Field(default_factory=list, max_length=100)
    imports: list[dict] = Field(default_factory=list, max_length=5000)

    @model_validator(mode="after")
    def integrity(self):
        for collection in [
            "accounts",
            "transactions",
            "budgets",
            "holdings",
            "goals",
            "notes",
            "rules",
            "scenarios",
            "prices",
            "checkpoints",
        ]:
            rows = getattr(self, collection)
            if len({r.id for r in rows}) != len(rows):
                raise ValueError(f"Duplicate IDs in {collection}.")
        if len({c.date for c in self.checkpoints}) != len(self.checkpoints):
            raise ValueError("Only one portfolio checkpoint per date is allowed.")
        if len({(p.ticker.upper(), p.date) for p in self.prices}) != len(self.prices):
            raise ValueError(
                "Only one historical price per ticker and date is allowed."
            )
        accounts = {a.id: a for a in self.accounts}
        for t in self.transactions:
            if t.account_id not in accounts:
                raise ValueError("A transaction references a missing account.")
            if t.date < accounts[t.account_id].opened:
                raise ValueError(
                    "Transaction predates account opening. Edit the opening date/balance first."
                )
        keys = [(b.category.lower(), b.month) for b in self.budgets]
        if len(set(keys)) != len(keys):
            raise ValueError("Only one budget per category and month is allowed.")
        return self


ENTITY_TYPES = {
    "accounts": Account,
    "transactions": Transaction,
    "budgets": Budget,
    "holdings": Holding,
    "goals": Goal,
    "notes": Note,
    "rules": Rule,
    "scenarios": Scenario,
    "prices": Price,
    "checkpoints": Checkpoint,
}


class Simulation(BaseModel):
    initial: float = Field(default=25000, ge=0, le=1e9, allow_inf_nan=False)
    monthly: float = Field(default=600, ge=0, le=1e7, allow_inf_nan=False)
    annual_return: float = Field(default=7, ge=-50, le=50, allow_inf_nan=False)
    years: int = Field(default=25, ge=1, le=60)
    inflation: float = Field(default=2.5, ge=0, le=20, allow_inf_nan=False)
    fee: float = Field(default=0.15, ge=0, le=10, allow_inf_nan=False)
    contribution_growth: float = Field(default=2, ge=0, le=20, allow_inf_nan=False)
    frequency: Literal["monthly", "quarterly", "annually"] = "monthly"
    tax: float = Field(default=0, ge=0, le=60, allow_inf_nan=False)
    volatility: float = Field(default=15, ge=0, le=80, allow_inf_nan=False)
    target: float = Field(default=1_000_000, gt=0, le=1e12, allow_inf_nan=False)
    paths: int = Field(default=1500, ge=100, le=5000)
    seed: int = Field(default=42, ge=0, le=2**32 - 1)
