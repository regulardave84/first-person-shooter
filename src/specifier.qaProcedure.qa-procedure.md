# QA Procedure: Specifier generates a manual UI QA procedure from approved feature requirements

> Scope: Manual UI verification checklist for the specifier workflow.
> Gate: Run only after acceptance scenarios are approved.

## Pass/Fail Policy

- Mark **Pass** only when all expected results for a manual test are observed.
- Mark **Fail** if any expected result is missing or incorrect.

## Manual Test 1: Generate QA procedure document after acceptance approval

- Source scenario: Generate QA procedure document after acceptance approval

### Setup

- Ensure a feature request has approved Gherkin acceptance scenarios.
- Open the workspace in VS Code.

### UI Actions

1. Submit a feature prompt to start the specifier workflow.
2. Confirm acceptance criteria are generated and approved.
3. Continue the workflow.

### Expected Results

- A QA procedure document file is written for manual UI verification.
- The document is linked to the accepted feature behavior.

### Pass/Fail Criteria

- Pass: a QA procedure document exists and reflects the accepted behavior.
- Fail: no QA document is produced, or produced content does not match accepted behavior.

## Manual Test 2: Include actionable manual test steps and expected outcomes

- Source scenario: Include actionable manual test steps and expected outcomes

### Setup

- Use an approved feature with at least one scenario.

### UI Actions

1. Open the generated QA procedure document.
2. Inspect one manual test section.

### Expected Results

- The manual test includes setup/preconditions.
- The manual test includes step-by-step UI actions.
- The manual test includes expected outcomes.
- The manual test includes explicit pass/fail criteria.

### Pass/Fail Criteria

- Pass: all required sections are present and actionable.
- Fail: one or more required sections are missing or unclear.

## Manual Test 3: Preserve traceability between scenarios and manual tests

- Source scenario: Preserve traceability between scenarios and manual tests

### Setup

- Have the approved acceptance `.feature` file open.
- Have the generated QA procedure document open.

### UI Actions

1. Compare scenario names in the acceptance feature file to the manual test headings.
2. Verify each manual test references its source scenario.

### Expected Results

- Every accepted scenario is represented by a manual test section.
- Each manual test references the source scenario name.

### Pass/Fail Criteria

- Pass: full one-to-one traceability is visible.
- Fail: missing, renamed, or unmatched scenario/manual test entries.

## Manual Test 4: Keep the approval gate before implementation

- Source scenario: Keep the approval gate before implementation

### Setup

- Prepare a new prompt and run only the specifier phase.

### UI Actions

1. Generate acceptance criteria from the prompt.
2. Observe the workflow state before approval.
3. Approve acceptance criteria.

### Expected Results

- Before approval, implementation changes do not begin.
- The workflow asks for explicit approval.
- After approval, implementation can proceed.

### Pass/Fail Criteria

- Pass: implementation is blocked until explicit approval is provided.
- Fail: implementation starts before explicit approval.
