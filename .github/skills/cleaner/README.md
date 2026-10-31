# Cleaner AI Skill

The `cleaner` skill identifies Change Risk Anti-Patterns (CRAP) and drives safe refactoring.

- Skill definition: [SKILL.md](SKILL.md)
- Generated report: [reports/cleaner/CRAP_REPORT.md](../../../reports/cleaner/CRAP_REPORT.md)

## What cleaner does

- Combines cyclomatic complexity with test coverage.
- Enforces configured global coverage thresholds during cleaner coverage run.
- Computes CRAP score per function.
- Flags high-risk hotspots.
- Runs dependency policy validation after review and before cleanup refactors.
- Performs targeted cleanup/refactoring.
- Re-runs lint/tests/build for safety.

## Commands

- `npm run analyze:crap` (analyze existing coverage + complexity)
- `npm run deps:check` (scan source dependencies against allowed/disallowed policy)
- `npm run cleaner` (run coverage, CRAP analysis, then dependency check pre-cleanup gate)
