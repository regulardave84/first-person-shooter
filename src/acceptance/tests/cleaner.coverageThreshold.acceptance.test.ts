import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
	evaluateCoverageThresholds,
	hasCoverageThresholdOverrides,
} from '../../tools/cleanerCoverageGate';

describe('Acceptance: Cleaner enforces coverage quality threshold', () => {
	function readPackageScripts() {
		const packagePath = path.join(process.cwd(), 'package.json');
		const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
			scripts: Record<string, string>;
		};
		return packageJson.scripts;
	}

	it('Cleaner fails when branch coverage drops below threshold', () => {
		const evaluation = evaluateCoverageThresholds(
			{ lines: 98.6, functions: 96.5, statements: 98.6, branches: 94.41 },
			{ lines: 95, functions: 95, statements: 95, branches: 95 },
		);

		expect(evaluation.passed).toBe(false);
		expect(evaluation.violations[0]).toContain('branches');
		expect(evaluation.violations[0]).toContain('(95.00%)');
	});

	it('Cleaner passes when coverage meets configured thresholds', () => {
		const evaluation = evaluateCoverageThresholds(
			{ lines: 98.6, functions: 96.5, statements: 98.6, branches: 95.2 },
			{ lines: 95, functions: 95, statements: 95, branches: 95 },
		);

		expect(evaluation).toEqual({ passed: true, violations: [] });
	});

	it('Cleaner uses the same thresholds as the primary Vitest coverage policy', () => {
		const scripts = readPackageScripts();
		const cleanerCoverageCommand = scripts['test:coverage:cleaner'];

		expect(cleanerCoverageCommand).toContain('-c vitest.config.ts');
		expect(hasCoverageThresholdOverrides(cleanerCoverageCommand)).toBe(false);
	});

	it('Cleaner reporting preserves threshold context', () => {
		const evaluation = evaluateCoverageThresholds(
			{ lines: 95, functions: 95, statements: 95, branches: 94.9 },
			{ lines: 95, functions: 95, statements: 95, branches: 95 },
		);

		expect(evaluation.violations).toContain(
			'Coverage for branches (94.90%) does not meet global threshold (95.00%)',
		);
	});
});
