# Skills

Canonical, **harness-agnostic** agent skills for this repo (Agent Skills / `SKILL.md` style).

| Skill | Purpose |
|---|---|
| [`opta-core/`](./opta-core/) | Options math via `scripts/calc.mjs` only |

## Discovery adapters

In-repo symlinks point host-specific skill roots at this folder:

- `.agent/skills/opta-core` → `skills/opta-core` (broad agent compatibility)
- `.factory/skills/opta-core` → `skills/opta-core` (Factory Droid)

Edit only `skills/opta-core/`. Do not duplicate content under `.agent` or `.factory`.
