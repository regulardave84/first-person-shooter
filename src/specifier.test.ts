import { describe, expect, it } from 'vitest';
import {
	createAcceptanceTestsFromSpec,
	generateManualQaProcedureFromAcceptanceTests,
	generateUnitTestsFromAcceptanceTests,
	parseGherkinFeature,
	runScenario,
	type GherkinStep,
	type StepDefinitions,
} from './specifier';

describe('parseGherkinFeature()', () => {
	it('parses a feature with scenarios and steps', () => {
		const parsed = parseGherkinFeature(`
Feature: Player movement

  Scenario: Move forward
    Given the player is spawned
    When the player presses W
    Then the player moves on the -Z axis
`);

		expect(parsed.name).toBe('Player movement');
		expect(parsed.scenarios).toHaveLength(1);
		expect(parsed.scenarios[0]?.steps).toEqual([
			{ keyword: 'Given', text: 'the player is spawned' },
			{ keyword: 'When', text: 'the player presses W' },
			{ keyword: 'Then', text: 'the player moves on the -Z axis' },
		]);
	});

	it('throws when feature declaration is missing', () => {
		expect(() =>
			parseGherkinFeature(`
Scenario: Missing feature
  Given a precondition
  When an action occurs
  Then an outcome is observed
`),
		).toThrow('Feature must be declared before any scenario.');
	});

	it('throws when a scenario has no steps', () => {
		expect(() =>
			parseGherkinFeature(`
Feature: Empty scenario
  Scenario: Missing steps
`),
		).toThrow('has no steps');
	});

	it('throws when a step appears before any scenario', () => {
		expect(() =>
			parseGherkinFeature(`
Feature: Invalid
  Given outside scenario
`),
		).toThrow('Steps must be inside a scenario.');
	});

	it('throws when a step keyword has no text', () => {
		expect(() =>
			parseGherkinFeature(`
Feature: Invalid
  Scenario: Empty step text
    Given
`),
		).toThrow('cannot be empty');
	});

	it('throws when unsupported lines are present', () => {
		expect(() =>
			parseGherkinFeature(`
Feature: Invalid
  Scenario: Unknown syntax
    * this is not valid gherkin here
`),
		).toThrow('Unsupported Gherkin line');
	});

	it('throws when feature has no scenarios', () => {
		expect(() =>
			parseGherkinFeature(`
Feature: Lonely feature
`),
		).toThrow('Feature must include at least one scenario.');
	});

	it('throws when feature is missing entirely', () => {
		expect(() => parseGherkinFeature(`# comments only`)).toThrow(
			'Feature is missing.',
		);
	});
});

describe('createAcceptanceTestsFromSpec()', () => {
	it('builds Gherkin from human text blocks and ensures Given/When/Then', () => {
		const gherkin = createAcceptanceTestsFromSpec(
			`Player presses W
Then should move forward

Scenario: Strafing
When pressing A
Then should move left`,
			'Movement behavior',
		);

		expect(gherkin).toContain('Feature: Movement behavior');
		expect(gherkin).toContain('Scenario: Player presses W');
		expect(gherkin).toContain('Given the system is in a valid initial state');
		expect(gherkin).toContain('When Player presses W');
		expect(gherkin).toContain('Then should move forward');
		expect(gherkin).toContain('Scenario: Strafing');
	});

	it('normalizes valid Gherkin input', () => {
		const gherkin = createAcceptanceTestsFromSpec(`
Feature: Existing behavior
Scenario: Keep format
Given state
When action
Then result
`);

		expect(gherkin).toBe(
			`Feature: Existing behavior\n\n  Scenario: Keep format\n    Given state\n    When action\n    Then result`,
		);
	});

	it('throws when specification is empty', () => {
		expect(() => createAcceptanceTestsFromSpec('   ')).toThrow(
			'Specification cannot be empty.',
		);
	});

	it('adds missing When and Then when only Given is provided', () => {
		const gherkin = createAcceptanceTestsFromSpec(
			`Scenario: Setup only
Given the game is initialized`,
			'Given-only behavior',
		);

		expect(gherkin).toContain('Feature: Given-only behavior');
		expect(gherkin).toContain('Given the game is initialized');
		expect(gherkin).toContain('When the user performs the described action');
		expect(gherkin).toContain('Then the expected outcome is observed');
	});

	it('supports inferred keywords and normalizes bullets', () => {
		const gherkin = createAcceptanceTestsFromSpec(
			`Scenario: Inferred steps
- assuming the player is spawned
- after pressing W
- expect movement forward`,
		);

		expect(gherkin).toContain('Given assuming the player is spawned');
		expect(gherkin).toContain('When after pressing W');
		expect(gherkin).toContain('Then expect movement forward');
	});

	it('uses generated scenario names and fallback feature name when missing/blank', () => {
		const gherkin = createAcceptanceTestsFromSpec('.', '   ');

		expect(gherkin).toContain('Feature: Generated Feature');
		expect(gherkin).toContain('Scenario: Scenario 1');
	});

	it('truncates very long scenario names to keep output readable', () => {
		const longName = 'A'.repeat(95);
		const gherkin = createAcceptanceTestsFromSpec(
			`Scenario: ${longName}
Given a stable state`,
		);

		expect(gherkin).toContain(`Scenario: ${'A'.repeat(77)}...`);
	});
});

describe('runScenario()', () => {
	it('executes step handlers in order', async () => {
		const executed: string[] = [];
		const steps: GherkinStep[] = [
			{ keyword: 'Given', text: 'a player' },
			{ keyword: 'When', text: 'the player moves' },
			{ keyword: 'Then', text: 'position updates' },
		];

		const defs: StepDefinitions = {
			'Given a player': async (context) => {
				context.player = { x: 0 };
				executed.push('given');
			},
			'When the player moves': async (context) => {
				context.player = { x: 1 };
				executed.push('when');
			},
			'Then position updates': async (context) => {
				expect(context.player).toEqual({ x: 1 });
				executed.push('then');
			},
		};

		await runScenario(steps, defs, {});
		expect(executed).toEqual(['given', 'when', 'then']);
	});

	it('supports fallback lookup using step text only', async () => {
		const steps: GherkinStep[] = [
			{ keyword: 'Given', text: 'the game is ready' },
		];
		const defs: StepDefinitions = {
			'the game is ready': () => {
				// no-op
			},
		};

		await expect(runScenario(steps, defs)).resolves.toBeUndefined();
	});

	it('throws when a step definition is missing', async () => {
		await expect(
			runScenario([{ keyword: 'Then', text: 'unknown result' }], {}),
		).rejects.toThrow('Missing step definition for: Then unknown result');
	});
});

describe('generateUnitTestsFromAcceptanceTests()', () => {
	it('generates Vitest scaffolding from approved Gherkin', () => {
		const output = generateUnitTestsFromAcceptanceTests(`
Feature: Camera pitch

  Scenario: Clamp pitch to max
    Given pitch starts at 0
    When mouse moves up quickly
    Then pitch is clamped to max
`);

		expect(output).toContain("import { describe, it } from 'vitest';");
		expect(output).toContain('Acceptance: Camera pitch');
		expect(output).toContain('it("Clamp pitch to max", async () => {');
		expect(output).toContain('"Given pitch starts at 0": async (context) => {');
		expect(output).toContain(
			'await runScenario(Clamp_pitch_to_max_steps, stepDefinitions, {});',
		);
	});

	it('deduplicates repeated step definitions across scenarios', () => {
		const output = generateUnitTestsFromAcceptanceTests(`
Feature: Dedup

	Scenario: One
		Given shared step
		When action one
		Then result one

	Scenario: Two
		Given shared step
		When action two
		Then result two
`);

		const sharedCount = output.match(/"Given shared step"/g)?.length ?? 0;
		expect(sharedCount).toBe(1);
	});

	it('creates safe scenario variable identifiers for numeric and symbol names', () => {
		const output = generateUnitTestsFromAcceptanceTests(`
Feature: Identifier generation

	Scenario: 123 launch sequence
		Given ready
		When launch starts
		Then launch succeeds

	Scenario: !!!
		Given neutral
		When noop
		Then done
`);

		expect(output).toContain('const step_123_launch_sequence_steps = [');
		expect(output).toContain('const unnamed_step_steps = [');
	});
});

describe('generateManualQaProcedureFromAcceptanceTests()', () => {
	it('writes a QA procedure document from approved acceptance scenarios', () => {
		const output = generateManualQaProcedureFromAcceptanceTests(`
Feature: Login flow

  Scenario: Sign in with valid credentials
    Given the login page is open
    When the user enters a valid email and password
    Then the dashboard is displayed
`);

		expect(output).toContain('# QA Procedure: Login flow');
		expect(output).toContain(
			'> Gate: Run this procedure only after acceptance scenarios are approved.',
		);
		expect(output).toContain(
			'## Manual Test 1: Sign in with valid credentials',
		);
	});

	it('includes setup, UI actions, expected results, and pass/fail criteria', () => {
		const output = generateManualQaProcedureFromAcceptanceTests(`
Feature: Profile update

  Scenario: Save profile changes
    Given the profile page is visible
    And the user is authenticated
    When the user edits the display name
    And the user presses Save
    Then a success toast is shown
    And the new display name appears in the header
`);

		expect(output).toContain('### Setup');
		expect(output).toContain('- the profile page is visible');
		expect(output).toContain('- the user is authenticated');
		expect(output).toContain('### UI Actions');
		expect(output).toContain('1. the user edits the display name');
		expect(output).toContain('2. the user presses Save');
		expect(output).toContain('### Expected Results');
		expect(output).toContain('- a success toast is shown');
		expect(output).toContain('- the new display name appears in the header');
		expect(output).toContain('### Pass/Fail Criteria');
	});

	it('preserves traceability by including source scenario names for each manual test', () => {
		const output = generateManualQaProcedureFromAcceptanceTests(`
Feature: Traceability

  Scenario: First scenario
    Given precondition one
    When action one
    Then result one

  Scenario: Second scenario
    Given precondition two
    When action two
    Then result two
`);

		expect(output).toContain('- Source scenario: First scenario');
		expect(output).toContain('- Source scenario: Second scenario');
	});
});
