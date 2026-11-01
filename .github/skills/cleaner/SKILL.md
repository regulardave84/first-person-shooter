---
name: cleaner
description: Detect Change Risk Anti-Patterns (CRAP) from cyclomatic complexity + coverage, review high-risk code, and refactor safely.
---

# Cleaner Skill

Use this skill to reduce change risk by combining complexity and coverage into a CRAP score.

## Goal

1. Assess repository directory structure as the first general code-review step.
2. Generate test coverage data.
3. Extract cyclomatic complexity by function.
4. Compute CRAP scores.
5. Review high-risk hotspots.
6. Refactor safely and re-verify.

## CRAP Formula

For each function:

$$
CRAP = C^2 \times (1 - cov)^3 + C
$$

Where:

- $C$ = cyclomatic complexity
- $cov$ = coverage ratio in $[0,1]$

## Required Workflow

### 1) General code review starts with directory structure assessment

- Perform directory structure assessment first before any cleanup refactor decision.
- Validate required repository layout conventions (including acceptance artifact folders).
- Report missing required directories and misplaced artifacts with actionable guidance.
- Treat critical structure violations as a failure gate for cleanup refactors.

### 2) Collect metrics

- Run coverage (`npm run test:coverage`).
- Enforce repository coverage thresholds during cleaner coverage execution (same policy as `vitest.config.ts`; no threshold downgrades).
- Run complexity analysis through ESLint complexity diagnostics.
- Produce report at `reports/cleaner/CRAP_REPORT.md`.

### 3) Risk bands

- **Low**: `< 10`
- **Moderate**: `10-19.99`
- **High**: `20-29.99`
- **Very High**: `>= 30`

### 4) Review scope

Prioritize production files (`src/**/*.ts`) and exclude test files.

### 5) Pre-cleanup dependency validation

- Run dependency checker (`npm run deps:check`) after directory-structure/code review and before any cleanup refactor.
- If dependency checker reports disallowed dependencies, mark cleaner run as failed.
- Do not perform cleanup refactor work until dependency check passes.

### 6) Refactor policy

- Start with highest CRAP items.
- Prefer extraction, guard clauses, and simplification.
- Keep behavior unchanged.
- Add/update tests when needed.

### 7) Verification gate

After each refactor wave, run:

- `npm run lint`
- `npm run test:all`
- `npm run build`

## Completion Criteria

- Directory structure assessment executed first during general code review.
- Directory-structure findings are reported with actionable remediation.
- CRAP report generated.
- Highest-risk hotspots reviewed.
- Dependency checker executed between review and cleanup.
- At least one targeted refactor completed when risk is high.
- Lint/tests/build pass.
