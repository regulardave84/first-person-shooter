---
name: hardener
description: Analyze branch changes, run full test-suite gating, block on failures, run branch-scoped mutation testing, and iteratively improve tests until mutation score is at least 80%.
---

# Hardener Skill

Use this skill when you need to harden test quality for the current branch.

## Practical Lessons Applied

This version includes safeguards for common real-world issues seen during hardening:

- Mutation tooling/runtime compatibility can fail (runner mismatch).
- Mutation artifacts can pollute lint/test runs (`.stryker-tmp`, `reports`).
- Mutation score should be improved iteratively with targeted tests, not random assertions.
- The loop needs explicit progress checks and stop conditions.

## Goal

For the current branch:
1. Analyze what changed.
2. Run the full test suite first.
3. If relevant tests fail, stop and report failures.
4. If tests pass, run mutation testing.
5. If mutation score is below 80%, add or correct tests based on survivors.
6. Repeat mutation loop until score is >= 80%.

## Required Workflow

### 0) Preflight checks (before test execution)

- Verify required scripts exist in `package.json`: `test`, `test:mutation`, and `test:mutation:branch`.
- Verify mutation config exists (`stryker.conf.json` or equivalent).
- Verify lint/test ignore generated mutation directories:
  - `.stryker-tmp/**`
  - `reports/**`
- If ignored paths are missing, add/update config before proceeding.
- If the selected Stryker runner crashes due to compatibility issues, switch to a compatible runner strategy (for example, command runner invoking `npm run test`) and continue.

### 1) Analyze changes on branch

- Determine the branch diff against `origin/main` (or closest available base branch).
- List changed files and group by type:
  - source files (`src/**/*.ts` excluding test files)
  - test files (`src/**/*.test.ts`)
  - config/tooling files (`package.json`, test/lint configs)

### 2) Run full test suite gate

- Run the entire suite before mutation testing: `npm run test:all`.
- Before running non-mutation tests, clean stale mutation artifacts if present to avoid false positives/noise.

### 3) Test failure gate (hard stop)

If any tests fail in the full suite gate:

- Report that the full test suite is failing.
- Include failing test names/files and concise reason.
- State clearly: **mutation testing cannot continue until the full suite passes**.
- Stop execution.

### 4) Run mutation testing

When relevant tests pass:

- Build mutation scope from current-branch changed implementation files (`src/**/*.ts`, excluding test files).
- Run mutation tests using branch-scoped mutate targets (`npm run test:mutation:branch`).
- If no implementation files are changed, report `BLOCKED` with mutation scope details and stop.
- Capture the overall mutation score for all files.
- Use threshold: **80% minimum**.
- Capture survivor list grouped by mutation type and source location.

### 5) Improvement loop for score < 80%

If score is below 80%:

- Inspect survived mutants from report output (`reports/mutation/index.html` and CLI output).
- Add or correct unit tests that target real behavioral gaps.
- Prefer meaningful assertions over implementation-coupled checks.
- Prioritize survivors in this order:
  1. Conditionals and branch removal (`if (true/false)`, block removals)
  2. Assignment/sign/arithmetic mutations (`+=`/`-=`, `+`/`-`, `*`/`/`)
  3. Constant mutations and boundary shifts
- Re-run relevant unit tests for changed tests.
- Re-run mutation tests.
- Repeat until score >= 80%.

### 6) Loop control and safety

- Maximum loop attempts: **5** mutation iterations.
- If score does not improve across **2 consecutive iterations**, report `BLOCKED` with likely causes and the top surviving mutants.
- If equivalent mutants are suspected, document evidence; still keep status `BLOCKED` unless score reaches threshold or project policy allows exclusions.

### 7) Mutation scope traceability (required)

- Every mutation iteration report must include:
  - base branch used for diff
  - changed files considered
  - final mutate target list used by Stryker
- Persist and/or surface this scope before the mutation run so reviewers can verify branch alignment.

## Test Authoring Guidance

When killing surviving mutants:

- Cover boundary values and clamping behavior.
- Assert direction-specific movement (sign and axis) for key combinations.
- Add cancellation cases for contradictory inputs.
- Validate normalization/invariant properties (e.g., diagonal speed not boosted).
- Avoid weak assertions that would still pass on incorrect arithmetic/sign mutations.

## Completion Criteria

Do not consider task complete until all are true:

1. Relevant tests pass.
2. Mutation test run succeeds.
3. Overall mutation score is >= 80%.
4. Any test changes are committed-ready and consistent with existing style.
5. Documentation is updated when commands/configuration change.
6. Lint/build still pass after test updates.

## Reporting Format

When done, report:

- Changed files
- Relevant tests executed (with scope rationale)
- Mutation score per iteration (before/after)
- What tests were added/updated and why
- Surviving mutants (if any) and mitigation rationale
- Final status (`PASS` when >= 80%, otherwise `BLOCKED`)
