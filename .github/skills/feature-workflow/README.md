# Feature Workflow AI Skill

The `feature-workflow` skill orchestrates full feature delivery through the project skill chain:

1. `specifier`
2. `implementer`
3. `cleaner`
4. `hardener`

- Skill definition: [SKILL.md](SKILL.md)

## Purpose

Use this as the default path when a prompt asks to add or change a feature.

## Guarantees

- Gherkin approval gate before implementation
- Scenario-to-test traceability
- Cleanup/refactor pass after implementation
- Dependency-policy gate in cleaner after review and before cleanup refactor
- Branch-scoped mutation hardening target of >= 80%
- Phase-by-phase reporting with blockers
