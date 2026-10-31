import { describe, expect, it } from 'vitest';
import {
	evaluateCoverageThresholds,
	hasCoverageThresholdOverrides,
} from './tools/cleanerCoverageGate';

describe('cleanerCoverageGate', () => {
	it('fails with clear violation messages when a metric is below threshold', () => {
		const result = evaluateCoverageThresholds(
			{ lines: 98, functions: 97, statements: 98, branches: 94.41 },
			{ lines: 95, functions: 95, statements: 95, branches: 95 },
		);

		expect(result.passed).toBe(false);
		expect(result.violations).toContain(
			'Coverage for branches (94.41%) does not meet global threshold (95.00%)',
		);
	});

	it('passes when all metrics meet thresholds', () => {
		const result = evaluateCoverageThresholds(
			{ lines: 98.6, functions: 96.5, statements: 98.6, branches: 95.1 },
			{ lines: 95, functions: 95, statements: 95, branches: 95 },
		);

		expect(result).toEqual({ passed: true, violations: [] });
	});

	it('detects threshold overrides in command strings', () => {
		expect(
			hasCoverageThresholdOverrides(
				'vitest run --coverage --coverage.thresholds.lines=0',
			),
		).toBe(true);
		expect(
			hasCoverageThresholdOverrides(
				'vitest run -c vitest.config.ts --coverage --coverage.reporter=text',
			),
		).toBe(false);
	});
});
