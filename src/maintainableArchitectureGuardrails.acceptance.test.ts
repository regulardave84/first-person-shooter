import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
	evaluateCiLayerArchitectureGate,
	validateImplementerLayerMappings,
	validateSpecificationLayerContract,
} from './tools/architectureGuardrails';

describe('Acceptance: Enforce maintainable architecture guardrails for feature delivery', () => {
	function readPackageScripts() {
		const packagePath = path.join(process.cwd(), 'package.json');
		const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
			scripts: Record<string, string>;
		};
		return packageJson.scripts;
	}

	it('Specification layer requires modularity constraints in acceptance criteria', () => {
		const featureText = readFileSync(
			path.join(
				process.cwd(),
				'src/maintainableArchitectureGuardrails.acceptance.feature',
			),
			'utf8',
		);

		const validation = validateSpecificationLayerContract(featureText);

		expect(validation).toEqual({ passed: true, violations: [] });
	});

	it('Implementer layer enforces SOLID-aligned module boundaries', () => {
		const validation = validateImplementerLayerMappings([
			{
				scenario:
					'Specification layer requires modularity constraints in acceptance criteria',
				modulePath: 'src/tools/specifier/acceptanceGenerator.ts',
				responsibility: 'acceptance criteria generation policy',
			},
			{
				scenario: 'Implementer layer enforces SOLID-aligned module boundaries',
				modulePath: '.github/skills/implementer/SKILL.md',
				responsibility: 'implementation workflow contract',
			},
			{
				scenario: 'CI layer blocks monolithic file growth and architecture drift',
				modulePath: 'scripts/architecture-guardrails.mjs',
				responsibility: 'ci maintainability enforcement',
			},
		]);

		expect(validation.passed).toBe(true);
		expect(validation.violations).toEqual([]);
	});

	it('CI layer blocks monolithic file growth and architecture drift', () => {
		const scripts = readPackageScripts();

		expect(scripts['architecture:check']).toBe(
			'node scripts/architecture-guardrails.mjs',
		);
		expect(scripts.lint).toContain('npm run deps:check');
		expect(scripts.lint).toContain('npm run architecture:check');

		const passingGate = evaluateCiLayerArchitectureGate({
			sourceFiles: [{ filePath: 'src/core/gameLogic.ts', lineCount: 220 }],
			maxSourceFileLines: 1000,
			importBoundaryViolations: [],
			dependencyRuleViolations: [],
		});
		expect(passingGate.passed).toBe(true);

		const failingGate = evaluateCiLayerArchitectureGate({
			sourceFiles: [{ filePath: 'src/runtime/fpsRuntime.ts', lineCount: 1001 }],
			maxSourceFileLines: 1000,
			importBoundaryViolations: ['disallowed internal barrel import'],
			dependencyRuleViolations: ['disallowed dependency left-pad'],
		});
		expect(failingGate.passed).toBe(false);
		expect(failingGate.violations.length).toBeGreaterThan(0);
	});

	it('Handoff report shows traceability across all three layers', () => {
		const implementerSkillDoc = readFileSync(
			path.join(process.cwd(), '.github/skills/implementer/SKILL.md'),
			'utf8',
		);
		const checkpointLog = readFileSync(
			path.join(
				process.cwd(),
				'.github/skills/implementer/IMPLEMENTER_CHECKPOINTS.md',
			),
			'utf8',
		);

		expect(implementerSkillDoc).toContain('SOLID');
		expect(checkpointLog).toContain(
			'Maintainable architecture guardrails for feature delivery',
		);
		expect(checkpointLog).toContain('Scenario -> test mapping');
		expect(checkpointLog).toContain('Verification status');
	});
});
