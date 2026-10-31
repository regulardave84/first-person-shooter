---
name: cleaner
description: Detect Change Risk Anti-Patterns (CRAP) from cyclomatic complexity + coverage, review high-risk code, and refactor safely.
---

# Cleaner Skill

Use this skill to reduce change risk by combining complexity and coverage into a CRAP score.

## Goal

1. Generate test coverage data.
2. Extract cyclomatic complexity by function.
3. Compute CRAP scores.
4. Review high-risk hotspots.
5. Refactor safely and re-verify.

## CRAP Formula

For each function:

$$
CRAP = C^2 \times (1 - cov)^3 + C
$$

Where:

- $C$ = cyclomatic complexity
- $cov$ = coverage ratio in $[0,1]$

## Required Workflow

### 1) Collect metrics

- Run coverage (`npm run test:coverage`).
- Run complexity analysis through ESLint complexity diagnostics.
- Produce report at `reports/cleaner/CRAP_REPORT.md`.

### 2) Risk bands

- **Low**: `< 10`
- **Moderate**: `10-19.99`
- **High**: `20-29.99`
- **Very High**: `>= 30`

### 3) Review scope

Prioritize production files (`src/**/*.ts`) and exclude test files.

### 4) Refactor policy

- Start with highest CRAP items.
- Prefer extraction, guard clauses, and simplification.
- Keep behavior unchanged.
- Add/update tests when needed.

### 5) Verification gate

After each refactor wave, run:

- `npm run lint`
- `npm run test:all`
- `npm run build`

## Completion Criteria

- CRAP report generated.
- Highest-risk hotspots reviewed.
- At least one targeted refactor completed when risk is high.
- Lint/tests/build pass.
