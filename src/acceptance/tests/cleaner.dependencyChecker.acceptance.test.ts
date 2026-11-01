import { describe, expect, it } from 'vitest';
import {
	assessDirectoryStructure,
	getCleanerWorkflowOrder,
	runCleanerWorkflow,
} from '../../tools/cleanerWorkflow';

const PASSING_DIRECTORY_STRUCTURE = assessDirectoryStructure({
	requiredDirectories: [
		'src/acceptance/features',
		'src/acceptance/tests',
		'src/acceptance/tests/generated',
		'src/acceptance/qa',
	],
	existingDirectories: [
		'src',
		'src/acceptance',
		'src/acceptance/features',
		'src/acceptance/tests',
		'src/acceptance/tests/generated',
		'src/acceptance/qa',
	],
	repositoryPaths: [
		'src/acceptance/features/cleaner.dependencyChecker.acceptance.feature',
		'src/acceptance/tests/cleaner.dependencyChecker.acceptance.test.ts',
	],
});

describe('Acceptance: Cleaner runs dependency checker at the correct workflow stage', () => {
	it('Execute dependency checker after code review and before cleanup refactors', () => {
		expect(getCleanerWorkflowOrder()).toEqual([
			'directory-structure-assessment',
			'review',
			'dependency-check',
			'cleanup',
		]);
	});

	it('Fail cleaner workflow when dependency checker finds policy violations', () => {
		const result = runCleanerWorkflow({
			reviewCompleted: true,
			directoryStructure: PASSING_DIRECTORY_STRUCTURE,
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
			directoryStructure: PASSING_DIRECTORY_STRUCTURE,
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
			directoryStructure: PASSING_DIRECTORY_STRUCTURE,
			dependencyChecker: {
				passed: false,
				violations: ['left-pad'],
			},
		});

		expect(failed.report.dependencyChecker.status).toBe('failed');
		expect(failed.report.dependencyChecker.summary).toContain('violation');
	});
});
