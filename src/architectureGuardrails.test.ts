import { describe, expect, it } from 'vitest';
import {
	evaluateCiLayerArchitectureGate,
	validateImplementerLayerMappings,
	validateSpecificationLayerContract,
} from './tools/architectureGuardrails';

describe('architectureGuardrails core', () => {
	it('accepts specification wording that uses spaced module boundaries and singular reason wording', () => {
		const validation = validateSpecificationLayerContract(`
Feature: Example
  Scenario: Constrain design
    Then the criteria include explicit module boundaries
    And each module has a single reason to change
    And the criteria do not allow aggregator files to receive new feature logic
`);

		expect(validation).toEqual({ passed: true, violations: [] });
	});

	it('validates specification text includes module-boundary and aggregator constraints', () => {
		const validation = validateSpecificationLayerContract(`
Feature: Example
  Scenario: Constrain design
    Then the criteria include explicit module-boundary expectations
    And the criteria forbid adding new feature logic to aggregator files
`);

		expect(validation).toEqual({ passed: true, violations: [] });
	});

	it('flags missing specification-layer constraints', () => {
		const validation = validateSpecificationLayerContract(`
Feature: Missing constraints
  Scenario: Incomplete
    Then this has no architecture rules
`);

		expect(validation.passed).toBe(false);
		expect(validation.violations).toContain(
			'Specification must include explicit module-boundary expectations.',
		);
		expect(validation.violations).toContain(
			'Specification must explicitly forbid adding feature logic to aggregator files.',
		);
	});

	it('requires both module boundary and aggregator protection constraints', () => {
		const missingBoundary = validateSpecificationLayerContract(`
Feature: Missing boundary
  Scenario: Incomplete
    Then the criteria forbid adding new feature logic to aggregator files
`);
		expect(missingBoundary.passed).toBe(false);
		expect(missingBoundary.violations).toContain(
			'Specification must include explicit module-boundary expectations.',
		);

		const missingAggregator = validateSpecificationLayerContract(`
Feature: Missing aggregator constraint
  Scenario: Incomplete
    Then the criteria include explicit module-boundary expectations
`);
		expect(missingAggregator.passed).toBe(false);
		expect(missingAggregator.violations).toContain(
			'Specification must explicitly forbid adding feature logic to aggregator files.',
		);
	});

	it('passes implementer mapping when each module has one reason to change', () => {
		const validation = validateImplementerLayerMappings([
			{
				scenario: 'Map input work',
				modulePath: 'src/runtime/input.ts',
				responsibility: 'input handling',
			},
			{
				scenario: 'Map audio work',
				modulePath: 'src/runtime/audio.ts',
				responsibility: 'audio synthesis',
			},
		]);

		expect(validation.passed).toBe(true);
		expect(validation.violations).toEqual([]);
	});

	it('fails implementer mapping when one module has unrelated responsibilities', () => {
		const validation = validateImplementerLayerMappings([
			{
				scenario: 'Add input behavior',
				modulePath: 'src/runtime/fpsRuntime.ts',
				responsibility: 'input handling',
			},
			{
				scenario: 'Add projectile behavior',
				modulePath: 'src/runtime/fpsRuntime.ts',
				responsibility: 'projectile simulation',
			},
		]);

		expect(validation.passed).toBe(false);
		expect(validation.violations[0]).toContain(
			'Module src/runtime/fpsRuntime.ts has multiple responsibilities',
		);
	});

	it('normalizes implementer mappings with trim and lowercase and returns sorted module view', () => {
		const validation = validateImplementerLayerMappings([
			{
				scenario: 'Scenario A',
				modulePath: ' src/runtime/input.ts ',
				responsibility: ' Input Handling ',
			},
			{
				scenario: 'Scenario B',
				modulePath: 'src/runtime/audio.ts',
				responsibility: 'Audio Synthesis',
			},
		]);

		expect(validation.passed).toBe(true);
		expect(validation.byModule).toEqual([
			{
				modulePath: 'src/runtime/audio.ts',
				responsibilities: ['audio synthesis'],
			},
			{
				modulePath: 'src/runtime/input.ts',
				responsibilities: ['input handling'],
			},
		]);
	});

	it('reports validation errors for empty scenario module path and responsibility', () => {
		const validation = validateImplementerLayerMappings([
			{
				scenario: '   ',
				modulePath: 'src/runtime/input.ts',
				responsibility: 'input handling',
			},
			{
				scenario: 'Missing module',
				modulePath: '  ',
				responsibility: 'input handling',
			},
			{
				scenario: 'Missing responsibility',
				modulePath: 'src/runtime/audio.ts',
				responsibility: ' ',
			},
		]);

		expect(validation.passed).toBe(false);
		expect(validation.violations).toContain(
			'Implementer mapping must include a non-empty scenario name.',
		);
		expect(validation.violations).toContain(
			'Implementer mapping for scenario "Missing module" must include a target module path.',
		);
		expect(validation.violations).toContain(
			'Implementer mapping for scenario "Missing responsibility" must include a responsibility description.',
		);
	});

	it('evaluates CI maintainability limits and boundary violations', () => {
		const validation = evaluateCiLayerArchitectureGate({
			sourceFiles: [
				{ filePath: 'src/runtime/fpsRuntime.ts', lineCount: 954 },
				{ filePath: 'src/core/gameLogic.ts', lineCount: 180 },
			],
			maxSourceFileLines: 900,
			importBoundaryViolations: [
				'src/runtime/input.ts imports disallowed barrel src/fpsRuntime.ts',
			],
			dependencyRuleViolations: ['disallowed dependency left-pad'],
		});

		expect(validation.passed).toBe(false);
		expect(validation.oversizedFiles).toEqual([
			{ filePath: 'src/runtime/fpsRuntime.ts', lineCount: 954 },
		]);
		expect(validation.violations).toContain(
			'src/runtime/fpsRuntime.ts exceeds max source file length (954 > 900).',
		);
		expect(validation.violations).toContain(
			'Import boundary violation: src/runtime/input.ts imports disallowed barrel src/fpsRuntime.ts',
		);
		expect(validation.violations).toContain(
			'Dependency rule violation: disallowed dependency left-pad',
		);
	});

	it('treats files exactly at limit as valid and reports pass only when no violations exist', () => {
		const passing = evaluateCiLayerArchitectureGate({
			sourceFiles: [{ filePath: 'src/core/gameLogic.ts', lineCount: 1000 }],
			maxSourceFileLines: 1000,
			importBoundaryViolations: [],
			dependencyRuleViolations: [],
		});

		expect(passing.oversizedFiles).toEqual([]);
		expect(passing.violations).toEqual([]);
		expect(passing.passed).toBe(true);
	});
});
