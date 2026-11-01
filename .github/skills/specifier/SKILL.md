---
name: specifier
description: Convert human-written specifications into Gherkin acceptance tests, ask for user review/approval, and generate unit-test scaffolding from approved acceptance tests.
---

# Specifier Skill

Use this skill when a stakeholder provides natural-language requirements and you need testable acceptance criteria, executable unit-test scaffolding, and a manual UI QA procedure.

## Practical Lessons Applied

This version adds safeguards based on real usage:

- Approval must be explicit and persisted in a dedicated `.feature` file.
- Accepted Gherkin should be treated as a locked contract, not a draft.
- Unit tests should be traceable scenario-by-scenario to acceptance tests.
- Runtime-heavy behavior should be extracted into testable pure helpers where possible.
- Generated tests should fail loudly when step mappings are missing.
- Existing feature files should be reused when the requested intent already exists.

## Core Contract

1. Convert human specifications into Gherkin (`Feature`, `Scenario`, `Given`, `When`, `Then`).
2. **Prompt the user to review acceptance tests before implementation.**
3. **Do not change acceptance tests after review without explicit user permission.**
4. Parse approved acceptance tests into unit-test scaffolding.
5. Generate a manual UI QA procedure document from approved acceptance scenarios.
6. Preserve one-to-one traceability between `Scenario` items and generated unit tests/manual tests.
7. Reuse and update matching existing feature file(s) instead of creating duplicate feature files.

## Required Workflow

### 1) Capture and normalize the specification

- Parse the user input into requirement blocks.
- Preserve intent and domain language.
- If any requirement is ambiguous, mark it explicitly in acceptance criteria comments or names.

### 2) Generate acceptance tests in Gherkin

- Output one `Feature` with one or more `Scenario` blocks.
- Ensure every scenario has at least one `Given`, one `When`, and one `Then`.
- Prefer single-behavior scenarios with explicit outcomes.
- Keep wording behavior-focused and implementation-agnostic.

### 2.1) Acceptance quality checks (before review)

- Validate Gherkin structure:
	- exactly one `Feature` header
	- at least one `Scenario`
	- each scenario has non-empty steps
- Normalize formatting (stable indentation and ordering) to reduce noisy diffs.
- Flag ambiguity explicitly (example: “TBD” or “clarify expected outcome”).
- For architecture-impacting features, require explicit modularity constraints:
	- include module-boundary expectations in acceptance text
	- explicitly forbid adding new feature logic to aggregator/barrel files

### 2.2) Existing feature-file reuse checks (before proposing a new file)

- Scan existing feature files under `src/acceptance/features`.
- Evaluate candidate matches using:
	- feature title/name similarity
	- scenario intent overlap
	- domain vocabulary consistency
- If one or more matching feature file(s) exist, propose updates to those existing file(s).
- Do not create a new feature file when a matching existing file already covers the same intent.
- Create a new feature file only when no suitable match exists.

### 3) Human review gate (mandatory)

Before generating/altering implementation tests:

- Ask the user to review the acceptance tests.
- Wait for explicit approval (or requested edits).
- Treat approved acceptance tests as immutable unless the user grants permission for edits.
- When updating an existing feature file, show the proposed delta and require explicit approval before persisting.

After approval:

- Persist approved tests in a canonical `.feature` file under `src/acceptance/features` (single source of truth), preferring updates to matched existing feature file(s) over creating new files.
- Add a lock notice comment (approved date + “do not modify without permission”).
- Reject silent rewrites or auto-edits to approved acceptance tests.

### 4) Parse accepted Gherkin into unit tests

- Parse `Feature`/`Scenario`/steps into an AST-like model.
- Generate deterministic unit-test scaffolding (e.g., Vitest).
- Persist generated acceptance scaffolding in `src/acceptance/tests/generated`.
- Create placeholders for step definitions and assertions where needed.
- Generate one `it(...)` block per scenario, preserving scenario names.
- Keep step-definition keys deterministic (`Given ...`, `When ...`, `Then ...`).
- If parsing fails, stop and report exact failing line/context.

### 4.2) Generate manual UI QA procedure document

- Generate a markdown QA procedure document from the approved `.feature` file.
- Write one manual test section per accepted `Scenario`.
- For each manual test include:
	- source scenario name (traceability)
	- setup/preconditions
	- step-by-step UI actions
	- expected UI outcomes
	- clear pass/fail criteria
- Persist the QA procedure in the repository under `src/acceptance/qa` (for example `src/acceptance/qa/<feature>.qa-procedure.md`).
- Regenerate the QA procedure whenever approved scenarios change.

### 4.1) Testability bridge for implementation code

- If acceptance behavior depends on browser/engine APIs, create a small runtime helper module with pure/testable functions.
- Unit tests should target those helpers while preserving production behavior.
- Avoid changing acceptance text to fit implementation; adapt code/test boundaries instead.

### 5) Change-control rule

- If acceptance tests are approved, any proposed change must be shown and approved first.
- If no approval is provided, continue using the last approved version.

### 6) Regeneration and drift control

- Regenerate scaffolding only from the approved `.feature` source.
- Do not hand-edit generated acceptance-scaffold files unless explicitly marked as manual.
- When acceptance scenarios change (with permission), regenerate tests and report scenario add/remove/rename diffs.

## Reporting Format

When a run is complete, report:

- acceptance file path
- acceptance file action (`updated-existing` | `created-new`)
- approval status (pending/approved)
- generated test file path(s)
- generated QA procedure file path
- scenario-to-test mapping summary
- scenario-to-manual-test mapping summary
- any blocked items (ambiguity, parse errors, missing step handlers)

## Completion Criteria

- Acceptance tests generated and shown.
- User is prompted for review.
- Approved acceptance tests are parsed successfully.
- Unit-test scaffolding is generated from approved tests.
- Manual UI QA procedure is generated from approved tests.
- Scenario/test/manual traceability is documented and complete.
- No unapproved acceptance-test modifications are made.
