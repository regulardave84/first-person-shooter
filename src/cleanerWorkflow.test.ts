import { describe, expect, it } from 'vitest';
import {
	getCleanerWorkflowOrder,
	runCleanerWorkflow,
} from './tools/cleanerWorkflow';

describe('cleanerWorkflow', () => {
	it('returns review -> dependency-check -> cleanup stage order', () => {
		expect(getCleanerWorkflowOrder()).toEqual([
			'review',
			'dependency-check',
			'cleanup',
		]);
	});

	it('throws when review is not completed before dependency validation', () => {
		expect(() =>
			runCleanerWorkflow({
				reviewCompleted: false,
				dependencyChecker: { passed: true, violations: [] },
			}),
		).toThrow('requires completed code review');
	});

	it('fails and blocks cleanup when dependency checker reports violations', () => {
		const result = runCleanerWorkflow({
			reviewCompleted: true,
			dependencyChecker: {
				passed: false,
				violations: ['left-pad'],
				findings: { discovered: ['three', 'left-pad'], unlisted: [] },
			},
		});

		expect(result.status).toBe('failed');
		expect(result.cleanupExecuted).toBe(false);
		expect(result.report.dependencyChecker.summary).toContain('failed');
		expect(result.report.dependencyChecker.violations).toEqual(['left-pad']);
	});

	it('passes and continues to cleanup when dependency checker passes', () => {
		const result = runCleanerWorkflow({
			reviewCompleted: true,
			dependencyChecker: {
				passed: true,
				violations: [],
				findings: { discovered: ['three'], unlisted: [] },
			},
		});

		expect(result.status).toBe('passed');
		expect(result.cleanupExecuted).toBe(true);
		expect(result.report.dependencyChecker.summary).toContain('passed');
	});

	it('fails when checker is marked not passed even with no listed violations', () => {
		const result = runCleanerWorkflow({
			reviewCompleted: true,
			dependencyChecker: {
				passed: false,
				violations: [],
			},
		});

		expect(result.status).toBe('failed');
		expect(result.cleanupExecuted).toBe(false);
		expect(result.report.dependencyChecker.violations).toEqual([]);
	});

	it('uses zero counts in pass summary when findings are omitted', () => {
		const result = runCleanerWorkflow({
			reviewCompleted: true,
			dependencyChecker: {
				passed: true,
				violations: [],
			},
		});

		expect(result.report.dependencyChecker.summary).toContain(
			'0 discovered dependency(ies) and 0 unlisted.',
		);
	});
});
