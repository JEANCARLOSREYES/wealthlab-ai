# WealthLab AI

**Your money, in perspective.** A personal financial command center for budgeting, portfolio research and investment modeling. No bank logins, paid data providers or required AI subscription.

Two editions share one interface:

| | Local Python edition | GitHub Pages edition |
|---|---|---|
| Storage | SQLite on your computer | IndexedDB in your browser |
| Calculations | Python / NumPy | TypeScript / typed arrays |
| CSV processing | Pandas + Python CSV | Papa Parse |
| Built-in JARVIS | Saved-data analysis | Saved-data analysis |
| Optional local language model | Ollama | Use the Python edition |
| Data synchronization | None | None |

The public website starts with **fictional demo data**. Personal records entered into the Pages edition remain in that browser; they are not uploaded to GitHub. Clearing browser site data removes them. Export backups regularly. The local database and browser records are separate.

## Run locally

Requirements: Python 3.11+ and a supported Node.js version (20.19+, 22.12+, or newer LTS). Python 3.14 and Node 24 were used for local verification. A one-time internet connection downloads free open-source packages. After setup, the finance tools run offline.

```sh
python3 scripts/setup.py
python3 scripts/start.py --open
```

Or double-click **Launch WealthLab.command** after setup. The setup script also detects Codex's bundled Node runtime if Node is not on your PATH. `start.py` runs the compiled React app and API in **one process** at `http://127.0.0.1:8000`. Stop with Control+C in Terminal. No Docker, Redis, workers, hosted database or account is needed.

On a fresh Mac, install Python and Node from their official websites before using setup. If a browser will not open automatically, enter the printed local URL manually. macOS may require you to open a downloaded `.command` file from Finder's Open menu.

## What you can do

- **Overview:** saved net worth, account balances, income, spending, savings rate, six months of recorded account history, spending allocation and goal progress. Create and edit accounts with explicit opening balances.
- **Transactions:** search merchants and notes, filter dates/types/categories/accounts, sort, paginate, edit and export the ledger. Review recurring-payment candidates and import history. Create first-match merchant categorization rules.
- **CSV imports:** upload or drag a file; review its raw rows; map bank-specific columns; choose ISO, US or international dates; use signed amounts or debit/credit columns; reverse signs; review validation and possible duplicates; then explicitly commit. All rows must be valid; invalid imports save nothing. You can deliberately include legitimate identical transaction/holding records. Duplicate historical ticker/date prices must be edited instead.
- **Budget Studio:** monthly category limits, fixed/variable labels, actual utilization, over-plan warnings, unbudgeted spending, prior-month copying and historical comparisons. Explore an editable percentage split before setting category limits.
- **Investments:** manual purchase lots, cost basis, unrealized gains, asset classes, concentration and target allocation gaps. Import purchase lots and historical prices. Maintain dated valuation checkpoints and external flows for return calculations.
- **Wealth Simulator:** lump sum and regular investing, monthly/quarterly/annual contributions, effective annual compounding, contribution increases, fees, inflation, terminal gain tax, seeded Monte Carlo paths, percentile bands, distributions, target probability, baseline/conservative/optimistic comparison, saved scenarios, yearly tables and CSV exports. Set monthly contributions to zero for lump-sum investing; set return/fee to zero to explore uninvested savings.
- **Financial Goals:** earmarked savings, monthly targets, contribution gaps and no-growth completion estimates. Emergency-fund and fixed-rate debt payoff explorers.
- **Research & Notes:** editable plain-text notes, tags, search, pinning and a monthly review checklist.
- **JARVIS:** read-only explanations of saved spending, recurring payments, goals and portfolio data. The built-in assistant uses explicit calculations and topic matching. Open-ended language assistance requires an optional local Ollama model in the Python edition. Chats are session-only.
- **Settings:** independent demo/personal workspaces, demo reset, JSON backup/restore, transaction CSV export and local model connection checks. A previous-state backup is retained before a restore.
- **Everywhere:** keyboard command palette (`⌘K` / `Ctrl+K`), quick-add forms, keyboard-accessible dialogs, a mobile navigation drawer, reduced-motion styling and a JARVIS shortcut.

## First personal import

1. Select **Start with my data**. The personal workspace starts empty.
2. Add an account with its balance immediately **before** the first transaction you intend to import. Use a negative opening balance for a liability. Only import transactions on or after that opening date.
3. Open Transactions → Import CSV. Map columns and review classifications. In automatic date mode, slash dates use **US month/day/year**; choose day/month/year explicitly when needed.
4. Classify income, purchases and internal transfers carefully. A credit-card payment is a transfer, not another expense. For transfers between tracked accounts, import/record both equal-and-opposite ledger entries. Missing transfer legs make account balances incomplete.
5. Set budgets, add holdings with manually supplied prices, and create goals. Export a JSON backup after your review.

Sample CSVs in `public/samples/` are fictional. Adapt their dates and account opening dates when testing. A holding row is a purchase lot; for brokerage cash use asset class `Cash`, units equal to dollars, and a $1 unit price. Do not also record that same brokerage cash as an account asset.

## How the financial calculations work

**Money:** account balances and transaction amounts use integer cents. Holdings use units × a price expressed in cents, rounded per lot. The account opening balance is before activity on its opening date. USD is the only supported currency; there is no exchange-rate conversion.

**Net worth:** positive account balances + current holding values − negative account balances. Goal earmarks are not extra assets. Avoid entering the same asset twice in accounts and holdings.

**Income/spending:** use explicit transaction types; internal transfers affect account balances but neither income nor spending. Savings means recorded income less recorded expenses, not a reconciled change in cash. It does not automatically subtract investment contributions. Partial months and incomplete imports understate activity.

**History:** the overview reconstructs account balances from opening balances and transactions, using only accounts opened by each chart date. The chart excludes investments because a current holding price does not establish historical portfolio value. Unrecorded activity is unknown. Current net worth and account balances are as of the latest saved records; the reporting month controls income, spending and budgets.

**Investment gains:** current lot value less acquisition cost is unrealized gain, not a contribution-adjusted portfolio return. These figures exclude dividends, realized trades, fees and taxes. Price observations do not automatically overwrite current holding prices.

**Return ledger:** each checkpoint contains the whole portfolio's value **after** an external flow at the end of that checkpoint day. Positive flow = contribution; negative = withdrawal. Add a checkpoint for **every external flow** and record the first starting valuation. TWR links `(ending value − end flow) / previous value` across periods; it is cumulative, not annualized. XIRR uses negative starting value, negative contributions/positive withdrawals, and positive ending value, with actual dates and 365-day years. The opening checkpoint's flow is already included in its starting value. Multiple detected XIRR roots result in no single displayed MWR. Short-period annualization can exaggerate performance. Exact TWR depends on complete checkpoints and the stated end-flow convention; WealthLab cannot verify this completeness. The ledger is independent of account transactions and manual holding snapshots.

**Projections:** deterministic growth uses the effective monthly rate from `(1 + annual return) × (1 − annual fee)`. Contributions arrive at the end of the selected period and increase at each modeled year boundary. Inflation discounts the ending value; a flat terminal tax applies only to positive modeled gains. This is an educational simplification, not jurisdiction-specific tax calculation.

**Monte Carlo:** independent monthly lognormal gross returns are generated using the supplied annual arithmetic expected return and annual log volatility. Paths share the same contributions, fees and terminal gain tax conventions. Percentiles are 10th/50th/90th, nominal and after tax. A target probability is the fraction of simulated final values reaching the nominal target. It describes this model under these assumptions, not a real-world forecast. Python and browser editions use different seeded random generators; repeatability applies within each edition, not to identical paths between editions. Maximum 5,000 paths × 60 years.

## A beginner's map of the code

```text
src/App.tsx             Navigation, workspace loading, shared record editor
src/pages.tsx           Overview, ledger, budgets, portfolio, goals, notes, chat, settings
src/Simulator.tsx       Assumptions, scenario saving and interactive simulation output
src/Performance.tsx     Portfolio checkpoints and historical prices
src/Importer.tsx        Upload → map → validate → confirm
src/components.tsx      Shared panels, forms, buttons, dialogs and chart settings
src/types.ts            Shared types, currency helpers and API entry point
src/styles.css          Responsive design system, no remote fonts or image dependencies
src/browser/            GitHub Pages data adapter, schemas and financial calculations
backend/models.py       Pydantic validation contracts and relationships
backend/finance.py      Pure, testable financial calculations
backend/performance.py  TWR and XIRR methods
backend/main.py         FastAPI routes, SQLAlchemy storage and local Ollama client
backend/demo.py         Explicitly fictional demo generator
backend/tests/          Calculation, CSV and API regression tests
scripts/                First-run setup and one-process launch
```

React is the screen. FastAPI receives requests. Pydantic checks inputs. SQLAlchemy writes one validated workspace document into SQLite. A **revision number** works like a save counter: if another tab saved first, a stale write is rejected instead of silently overwriting it. Imports and record updates commit atomically.

The browser edition implements the same request contract using IndexedDB transactions and Zod validation. The pages do not need separate designs or separate forms. Because there is no backend on GitHub Pages, its calculations run in TypeScript and optional Ollama is disabled. This keeps the public site free to host.

## Development & checks

```sh
# Frontend dependencies: pnpm install (or npm install)
pnpm dev                       # Vite on 127.0.0.1:5173
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
pnpm build                     # TypeScript check + local production build
pnpm build:pages               # TypeScript check + browser-only build → dist-pages/
pnpm test                      # Browser calculation/validation tests
.venv/bin/python -m pytest backend/tests -q
```

The browser edition can be previewed with `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist-pages` after building. Stop any old local preview before reusing its port. Tests use temporary databases; they do not edit your financial workspace. API reference: `http://127.0.0.1:8000/docs` while the local edition runs.

The frontend uses React, TypeScript, Vite, Lucide and Recharts. Plain CSS supplies a small shared component system; there is no paid UI kit or heavy animation runtime. Backend requirements are pinned in `backend/requirements-lock.txt`. `pnpm-lock.yaml` pins frontend dependencies.

## GitHub Pages

The site uses GitHub Pages’ **Deploy from a branch → main → /docs** option. The committed `docs/` folder contains only the generated browser app and fictional fixtures. The Python backend is committed as source for local use; it does not execute on Pages. Relative asset paths support the project subdirectory. `data/`, virtual environments, dependency folders, local builds, backups and environment secrets are ignored by Git.

To publish a source change:

```sh
pnpm test
pnpm publish:build
# Review, commit and push the source plus the generated docs/ folder.
```

`prepare-pages.mjs` only replaces a docs folder carrying its generated marker. Edit `src/`, not the generated files. GitHub rebuilds the public site after `main` changes. Workflow templates in `automation/` show how to enable full CI and artifact deployment later; they are not installed under `.github/workflows` because the current Git credential cannot create workflows. This avoids requiring broader token permissions.

Search engines decide whether and when to index a public repository or Pages website; publication does not guarantee a search ranking. The direct link works once deployment succeeds.

## Privacy and boundaries

The local service binds only to loopback and rejects foreign hosts/origins. There is no authentication server; this is a single-user tool. The database and browser storage are **not encrypted by WealthLab**. Protect your device and backups. Local AI can be inaccurate; it cannot change records or move money. No brokerage connection, market feed, trades or bank synchronization is included.

This is a working educational application, not audited financial software. Verify imported records against your statements before relying on any derived balance. Portfolio cash-flow completeness, tax consequences and future market behavior cannot be inferred by the application.

Documentation references: [Vite requirements](https://vite.dev/guide/), [FastAPI database guidance](https://fastapi.tiangolo.com/tutorial/sql-databases/), [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
