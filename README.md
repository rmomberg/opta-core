# opta-core

Pure TypeScript math for options pricing and multi-leg analysis.

**opta-core** is the open-source calculation layer behind [Opta](https://github.com/rmomberg). It has no UI, no brokerage hooks, and no live market data. Use it from Node, the browser, or any app that needs Black-Scholes, multi-leg payoffs, and a light portfolio Monte Carlo.

---

## Why opta-core

Options tools are often either heavyweight platforms or opaque black boxes. This package is intentionally small:

- **Speed over configuration** — call a function, get a number
- **Clarity over completeness** — European BS + simple multi-leg math only
- **Library, not product** — bring your own UI and data

The full Opta product (strategy UX, Power Law portfolio tooling, live quotes, access gating) stays private. This repo is the portable math.

---

## Features (v0.1)

- Black-Scholes price, payoff, Greeks (delta, gamma, vega, theta, rho)
- Implied volatility (Newton-Raphson + bisection fallback)
- Multi-leg primitives: net debit, expiry P&L, payoff curves, aggregate Greeks
- Helpers for vertical spreads and straddles
- Light portfolio Monte Carlo (GBM, one draw per ticker)
- Zero runtime dependencies

---

## Install

```bash
npm install opta-core
```

Or use from source:

```bash
git clone https://github.com/rmomberg/opta-core.git
cd opta-core
npm install
npm test
npm run build
```

---

## Quick start

```ts
import {
  bsPrice,
  impliedVol,
  verticalSpread,
  expiryPnlAtSpot,
  simulatePortfolio,
} from 'opta-core';

// Single option
const call = bsPrice(100, 100, 1, 0.05, 0.2, 'call');
const iv = impliedVol(call, 100, 100, 1, 0.05, 'call');

// Bull call vertical
const legs = verticalSpread({
  ticker: 'TEST',
  optionType: 'call',
  longStrike: 100,
  shortStrike: 110,
  expiry: '2030-01-17',
  longPremium: 5,
  shortPremium: 2,
  underlyingPrice: 100,
  longIv: 0.25,
  shortIv: 0.24,
});

const pnlAt120 = expiryPnlAtSpot(legs, 120); // width - debit = 7

// Monte Carlo over the book
const mc = simulatePortfolio(legs, { numSimulations: 5000 });
console.log(mc.summaryStats);
```

---

## API surface

| Module | Exports |
|---|---|
| Black-Scholes | `bsPrice`, `optionPayoff`, `bsDelta`, `bsGamma`, `bsVega`, `bsTheta`, `bsRho`, `bsGreeks`, `impliedVol`, `normCdf`, `normPdf` |
| Multi-leg | `netDebit`, `expiryPayoffAtSpot`, `expiryPnlAtSpot`, `strategyMetrics`, `strategyPayoffCurve`, `strategyGreeks`, `legTheoreticalPrice`, `verticalSpread`, `straddle`, `signedQuantity` |
| Monte Carlo | `simulatePortfolio`, `solveTargetReturn` |
| Time | `yearsToExpiry`, `daysToExpiry`, `DEFAULT_RISK_FREE` |

Types: `OptionLeg`, `OptionType`, `Greeks`, `SimulationResult`, `PayoffPoint`, and related helpers.

---

## Design notes

- **IV units**: annualized decimal (`0.25` = 25%).
- **Premiums**: per unit of underlying (same units as BS price), not per contract multiplier.
- **Short legs**: set `side: 'short'` (or pass a negative `quantity`).
- **Monte Carlo**: independent GBM draws per ticker; legs on the same ticker share the terminal price. Cross-ticker correlation is not modeled in v0.1.
- **Not included (by design)**: Power Law scenario engines, Kelly sizing, live data, React UI.

---

## Intended use

- Learning and research tooling
- Embedding BS / multi-leg math in your own apps
- Prototyping strategy P&L without a full platform

Not intended for:

- Trade execution or brokerage integration
- Institutional risk systems
- Guaranteed pricing parity with every vendor model

---

## CLI (agent-friendly)

```bash
npm run build
npm run calc -- help
npm run calc -- price --S 100 --K 100 --T 1 --r 0.05 --sigma 0.2 --type call
```

`scripts/calc.mjs` returns JSON. Missing required flags yield `{ "ok": false, "missing": [...] }` so agents can ask for inputs instead of guessing.

## Factory skill

This repo ships a Droid skill at `.factory/skills/opta-core/` that answers options questions by calling the CLI only (no freeform numbers). Install personal copy:

```bash
mkdir -p ~/.factory/skills/opta-core
cp .factory/skills/opta-core/* ~/.factory/skills/opta-core/
```

Invoke with `/opta-core` or ask an options math question in a session that has the skill available.

## Development

```bash
npm test          # vitest
npm run typecheck
npm run build     # emits dist/ + .d.ts
```

---

## License

MIT © rmomberg

---

## Relationship to Opta

| Project | Visibility | Role |
|---|---|---|
| **opta-core** (this repo) | Public | Math library |
| Opta product app | Private | Full calculator UI and product features |

Contributions to the math layer are welcome via pull request.
