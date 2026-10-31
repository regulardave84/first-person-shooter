# Implementer AI Skill

The `implementer` skill converts approved Gherkin acceptance criteria into real unit tests and production code.

- Skill definition: [SKILL.md](SKILL.md)
- Persistent checkpoint log: [IMPLEMENTER_CHECKPOINTS.md](IMPLEMENTER_CHECKPOINTS.md)

## What implementer does

- Consumes approved `.feature` files from `specifier`
- Writes/updates unit tests mapped to each scenario
- Implements or updates production code to satisfy tests
- Enforces SOLID-aligned module boundaries (single reason to change)
- Uses mandatory phased checkpoints persisted to disk

## Checkpointing model

At each critical phase, progress is written to a physical file so work survives context loss and can be reviewed by both agent and user before proceeding.

Phases:

1. Intake + contract lock
2. Test design
3. Implementation
4. Verification
5. Handoff

Complex features include an upfront implementation plan with checkpoint gates and phase exit criteria.
