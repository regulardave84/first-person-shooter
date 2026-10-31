import { describe, expect, it } from 'vitest';
import {
	getCleanerWorkflowOrder,
	runCleanerWorkflow,
} from './tools/cleanerWorkflow';

describe('Acceptance: Cleaner runs dependency checker at the correct workflow stage', () => {
	it('Execute dependency checker after code review and before cleanup refactors', () => {
		expect(getCleanerWorkflowOrder()).toEqual([
			'review',
			'dependency-check',
			'cleanup',
		]);
	});

	it('Fail cleaner workflow when dependency checker finds policy violations', () => {
		const result = runCleanerWorkflow({
			reviewCompleted: true,
			dependencyChecker: {
				passed: false,
				violations: ['left-pad'],
			},
		});

		expect(result.status).toBe('failed');
		expect(result.cleanupExecuted).toBe(false);
	});

	it('Continue cleaner workflow when dependency checker passes', () => {
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
	});

	it('Include dependency checker outcome in cleaner reporting', () => {
		const failed = runCleanerWorkflow({
			reviewCompleted: true,
			dependencyChecker: {
				passed: false,
				violations: ['left-pad'],
			},
		});

		expect(failed.report.dependencyChecker.status).toBe('failed');
		expect(failed.report.dependencyChecker.summary).toContain('violation');
	});
});
