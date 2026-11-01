---
name: feature-workflow
description: Orchestrate feature delivery by chaining specifier -> implementer -> cleaner -> hardener with explicit gates and reporting.
---

# Feature Workflow Skill

Use this skill when a user requests a new feature or a feature change.

## Orchestration contract

Run these skills in this exact order:

1. `specifier`
2. `implementer`
3. `cleaner`
4. `hardener`

## Required execution steps

### Step 1: specification gate

- Run `specifier` on the user requirement.
- Generate acceptance scenarios in Gherkin.
- Generate a manual UI QA procedure document from approved scenarios.
- Reuse/update matching existing feature file(s) when intent already exists; create new feature files only when no suitable match exists.
- Persist approved scenarios to `src/acceptance/features/*.acceptance.feature`.
- Persist generated acceptance scaffolding to `src/acceptance/tests/generated/*.acceptance.generated.test.ts`.
- Persist generated QA procedures to `src/acceptance/qa/*.qa-procedure.md`.
- Request explicit user approval.
- **Do not proceed until approval is granted.**

### Step 2: implementation gate

- Run `implementer` using the approved `.feature` file.
- Ensure scenario-to-test mapping exists.
- Ensure required checkpoint entries are appended.

### Step 3: cleanup gate

- Run `cleaner` to review and reduce change risk.
- Ensure cleaner performs directory-structure assessment first within general code review.
- Run dependency checker during cleaner after review and before cleanup refactors.
- Apply safe refactors only (no behavior change).
- Re-run lint/tests/build after cleanup changes.

### Step 4: hardening gate

- Run `hardener` mutation workflow.
- Require full test-suite gate (`npm run test:all`) before mutation execution.
- Require branch-scoped mutation targeting based on current branch implementation changes.
- If mutation score < 80%, improve tests and iterate.
- Stop as `BLOCKED` only when loop/control rules are exhausted.

## Final quality checklist

- `npm run lint`
- `npm run test:all`
- `npm run build`
- `npm run test:mutation:branch` with score >= 80%

## Final report format

Include:

- Feature file path + approval status
- Scenario-to-test mapping summary
- Changed files by phase
- Mutation score by iteration
- Final status: `PASS` or `BLOCKED`
