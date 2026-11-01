# Specifier AI Skill

The `specifier` skill converts human-written requirements into Gherkin acceptance tests, then turns approved acceptance tests into unit-test scaffolding and a manual UI QA procedure.

- Skill definition: [SKILL.md](SKILL.md)

## Guarantees

- Prompts the user to review acceptance tests before implementation parsing.
- Never changes approved acceptance tests without explicit user permission.
- Generates deterministic parser output for unit-test generation.
- Generates a scenario-traceable manual QA procedure document for UI verification.
- Reuses and updates matching existing feature file(s) in `src/acceptance/features` to avoid duplicate acceptance contracts.
- Uses acceptance artifact folders by default:
	- `src/acceptance/features` for approved `.feature` files
	- `src/acceptance/tests/generated` for generated acceptance scaffolding
	- `src/acceptance/qa` for manual QA procedures

## Code Integration

Implementation lives in [src/specifier.ts](../../../src/specifier.ts) with tests in [src/specifier.test.ts](../../../src/specifier.test.ts).
