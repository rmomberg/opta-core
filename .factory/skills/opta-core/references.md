# opta-core skill references

## Library entry

- Package: `opta-core` (MIT, TypeScript ESM)
- Repo: https://github.com/rmomberg/opta-core
- Local default: `/Users/rafaelmomberg/TechDevelopment/mini-apps/opta-core`
- Public API: `src/index.ts` → `dist/index.js`

## CLI

- `scripts/calc.mjs` — only approved number source for this skill
- Requires `npm run build` so `dist/` exists

## OptionLeg shape (for mc / payoff)

```json
{
  "ticker": "TEST",
  "optionType": "call",
  "strike": 100,
  "expiry": "2030-06-20",
  "premium": 8,
  "quantity": 1,
  "underlyingPrice": 100,
  "impliedVol": 0.3,
  "side": "long"
}
```

`side`: `"long"` | `"short"`. Short legs flip payoff and cash sign.

## Related but private

- Full Opta app: `optaoptions` / `optaoptions-prod` (Vercel product) — do not open-source via this skill
- Power Law engines stay out of opta-core v0.1
