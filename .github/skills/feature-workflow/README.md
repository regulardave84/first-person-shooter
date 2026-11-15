# Feature Workflow AI Skill

The `feature-workflow` skill orchestrates full feature delivery through the project skill chain:

1. `specifier`
2. `implementer`
3. `cleaner`
4. `hardener`

Default execution is agentized: each phase runs in a separate dedicated agent and hands off artifacts to the next phase.

- Skill definition: [SKILL.md](SKILL.md)
- Early runtime QA checklist: [EARLY_QA_CHECKLIST.md](EARLY_QA_CHECKLIST.md)

## Purpose

Use this as the default path when a prompt asks to add or change a feature.

## Guarantees

- Gherkin approval gate before implementation
- Mandatory implementation-discovery questions before any implementation planning
- Dedicated per-phase agents with explicit handoff artifacts
- Hard-stop orchestration on `failed`/`blocked` phase status unless user explicitly overrides
- Scenario-to-test traceability
- Fast local validation path (`validate:fast`) during active iteration
- Full pre-merge quality path (`quality:pr` + branch mutation gate)
- Cleanup/refactor pass after implementation
- Early manual QA checkpoint after first runtime integration and before heavy hardening
- Dependency-policy gate in cleaner after review and before cleanup refactor
- Full test-suite hardener gate before mutation execution
- Branch-scoped mutation hardening target of >= 80%, or explicit `SKIPPED` when no implementation source files changed
- Phase-by-phase reporting with blockers
