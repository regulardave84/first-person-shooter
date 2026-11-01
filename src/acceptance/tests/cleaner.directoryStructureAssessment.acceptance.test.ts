import { describe, expect, it } from 'vitest';
import {
	assessDirectoryStructure,
	getCleanerWorkflowOrder,
	runCleanerWorkflow,
} from '../../tools/cleanerWorkflow';

describe('Acceptance: Cleaner performs directory structure assessment before cleanup work', () => {
	it('Directory structure assessment runs before all other cleaner stages', () => {
		expect(getCleanerWorkflowOrder()).toEqual([
			'directory-structure-assessment',
			'review',
			'dependency-check',
			'cleanup',
		]);
	});

	it('Cleaner validates expected repository layout conventions', () => {
		const result = assessDirectoryStructure({
			requiredDirectories: [
				'src/acceptance/features',
				'src/acceptance/tests',
				'src/acceptance/tests/generated',
				'src/acceptance/qa',
			],
			existingDirectories: ['src/acceptance/features', 'src/acceptance/tests'],
			repositoryPaths: [
				'src/playerRun.acceptance.feature',
				'src/acceptance/tests/playerRun.acceptance.test.ts',
			],
		});

		expect(result.passed).toBe(false);
		expect(result.missingRequiredDirectories).toEqual([
			'src/acceptance/qa',
			'src/acceptance/tests/generated',
		]);
		expect(result.misplacedAcceptanceArtifacts).toEqual([
			'src/playerRun.acceptance.feature',
		]);
	});

	it('Cleaner reports actionable structure findings', () => {
		const result = assessDirectoryStructure({
			requiredDirectories: ['src/acceptance/features'],
			existingDirectories: [],
			repositoryPaths: ['src/playerRun.acceptance.feature'],
		});

		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: 'src/acceptance/features',
					ruleViolated: 'missing-required-directory',
					recommendedAction: expect.stringContaining('Create required directory'),
				}),
				expect.objectContaining({
					path: 'src/playerRun.acceptance.feature',
					ruleViolated: 'misplaced-acceptance-artifact',
					recommendedAction: expect.stringContaining('Move acceptance artifact'),
				}),
			]),
		);
	});

	it('Cleaner blocks cleanup refactors on critical structure violations', () => {
		const directoryStructure = assessDirectoryStructure({
			requiredDirectories: ['src/acceptance/features'],
			existingDirectories: [],
			repositoryPaths: ['src/playerRun.acceptance.feature'],
		});

		const result = runCleanerWorkflow({
			reviewCompleted: true,
			directoryStructure,
			dependencyChecker: {
				passed: true,
				violations: [],
			},
		});

		expect(result.status).toBe('failed');
		expect(result.cleanupExecuted).toBe(false);
		expect(result.report.directoryStructure.status).toBe('failed');
	});
});
