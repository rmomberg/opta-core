# opta-core skill references

Harness-agnostic companion notes for `skills/opta-core/SKILL.md`.

## Library entry

- Package: `opta-core` (MIT, TypeScript ESM)
- Repo: https://github.com/rmomberg/opta-core
- Resolve root by `package.json` name `opta-core` (do not hardcode machine paths)
- Public API: `src/index.ts` → `dist/index.js`

## CLI

- `scripts/calc.mjs` — only approved number source for this skill
- Alias: `npm run calc -- <command> ...`
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

- Full Opta product app stays private
- Power Law engines stay out of opta-core v0.1
