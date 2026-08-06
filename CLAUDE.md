# CLAUDE.md — Sweat

> Repo root. Read this before writing any code.

---

## Situation

**Hackathon build. Hard cutoff 9:30 PM Thursday. One developer. There is no second day.**

Optimize every decision for *working software on screen*, not for correctness, extensibility, or elegance.

---

# THE PRD (authoritative — locked at 6:30 PM)

## Sweat

Turns unpaid startup work and cash invested into a live, real equity percentage and dollar value — instead of a guess.

### Core features (V1)

- **Sweat entries:** hours × (market rate − paid rate) × risk multiplier (1.0–2.0x)
- **Capital entries:** direct cash invested by a contributor/partner
- **Valuation engine:** EBITDA × industry multiple, recalculated per financial snapshot
- **Equity engine:** live % share and $ value per contributor from the combined pool
- **Dashboard:** donut chart + cap table (cash invested, sweat $, equity %, $ value)

### Out of scope

Vesting, export, auth, QuickBooks sync, edit/delete entries, tests, mobile responsive.

### Tech stack

Next.js + Tailwind + Supabase (Postgres) + Recharts

---

## Build order

1. **Phase 0** — Shell + deploy
2. **Phase 1** — Engines + dashboard in-memory (success criteria)
3. **Phase 2** — Supabase persistence (optional, kill by 8:15 if broken)
4. **Phase 3** — Polish only, no new logic

## Hard rules

- No auth. No RLS. Open anon access.
- All dashboard logic in `app/page.js`. Math in `lib/calc.js` only.
- JavaScript, not TypeScript.
- Add-only entries. No edit/delete.
- Deploy at phase boundaries.

## Guards (mandatory)

1. `pool === 0` → all percentages `0.0%`, no NaN
2. `ebitda <= 0` → dollar values show `—`, label "No positive EBITDA — percentages only."
