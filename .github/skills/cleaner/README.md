# Cleaner AI Skill

The `cleaner` skill identifies Change Risk Anti-Patterns (CRAP) and drives safe refactoring.

- Skill definition: [SKILL.md](SKILL.md)
- Generated report: [reports/cleaner/CRAP_REPORT.md](../../../reports/cleaner/CRAP_REPORT.md)

## What cleaner does

- Combines cyclomatic complexity with test coverage.
- Computes CRAP score per function.
- Flags high-risk hotspots.
- Performs targeted cleanup/refactoring.
- Re-runs lint/tests/build for safety.

## Commands

- `npm run analyze:crap` (analyze existing coverage + complexity)
- `npm run cleaner` (run coverage first, then CRAP analysis)
