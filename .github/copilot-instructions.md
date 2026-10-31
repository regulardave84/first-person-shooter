# Copilot Repository Instructions

## Default feature-delivery workflow

When a user asks to add, change, or extend a feature, follow this workflow in order:

1. **Run `specifier` skill**
   - Convert user requirements into Gherkin acceptance criteria.
   - Persist the acceptance criteria in a `.feature` file.
   - Ask for explicit user approval before proceeding.

2. **Run `implementer` skill**
   - Use only approved Gherkin as the implementation contract.
   - Create/update tests mapped to each scenario.
   - Implement production code to satisfy those tests.
   - Write checkpoints in `.github/skills/implementer/IMPLEMENTER_CHECKPOINTS.md`.

3. **Run `cleaner` skill**
   - Review and clean up implementation changes.
   - Use CRAP analysis and safe refactors.
   - Preserve behavior and re-verify quality gates.

4. **Run `hardener` skill**
   - Run mutation testing.
   - Improve tests for survivors until mutation score is at least 80% (or report blocked with evidence).

## Quality gates per feature request

Before final handoff, ensure these pass unless blocked by user-approved exceptions:

- `npm run lint`
- `npm run test:all`
- `npm run build`
- `npm run test:mutation` (hardener target: >= 80%)

## Change-control rules

- Do not modify approved acceptance Gherkin without explicit user permission.
- Keep scenario-to-test traceability explicit.
- Prefer minimal, style-consistent changes.
- Report outputs by phase (specifier, implementer, cleaner, hardener), including any blockers.
