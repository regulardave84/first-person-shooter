import { describe, expect, it } from 'vitest';
import {
	assessDirectoryStructure,
	getCleanerWorkflowOrder,
	runCleanerWorkflow,
} from './tools/cleanerWorkflow';

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
		'src/acceptance/features/playerRun.acceptance.feature',
		'src/acceptance/tests/playerRun.acceptance.test.ts',
		'src/acceptance/tests/generated/specifier.acceptance.generated.test.ts',
		'src/acceptance/qa/specifier.qa-procedure.md',
	],
});

describe('cleanerWorkflow', () => {
	it('returns directory-structure-assessment -> review -> dependency-check -> cleanup stage order', () => {
		expect(getCleanerWorkflowOrder()).toEqual([
			'directory-structure-assessment',
			'review',
			'dependency-check',
			'cleanup',
		]);
	});

	it('reports passing directory structure when required layout and artifact placement are valid', () => {
		const result = assessDirectoryStructure({
			requiredDirectories: ['src/acceptance/features', 'src/acceptance/tests'],
			existingDirectories: ['src/acceptance/features', 'src/acceptance/tests'],
			repositoryPaths: [
				'src/acceptance/features/fpsLogging.acceptance.feature',
				'src/acceptance/tests/fpsLogging.acceptance.test.ts',
			],
		});

		expect(result.passed).toBe(true);
		expect(result.findings).toEqual([]);
		expect(result.missingRequiredDirectories).toEqual([]);
		expect(result.misplacedAcceptanceArtifacts).toEqual([]);
	});

	it('reports missing directories and misplaced acceptance artifacts with actionable findings', () => {
		const result = assessDirectoryStructure({
			requiredDirectories: [
				'src/acceptance/features',
				'src/acceptance/tests',
				'src/acceptance/tests/generated',
			],
			existingDirectories: ['src/acceptance/features'],
			repositoryPaths: [
				'src/playerRun.acceptance.feature',
				'src/acceptance/tests/generated/specifier.acceptance.generated.test.ts',
			],
		});

		expect(result.passed).toBe(false);
		expect(result.missingRequiredDirectories).toEqual([
			'src/acceptance/tests',
			'src/acceptance/tests/generated',
		]);
		expect(result.misplacedAcceptanceArtifacts).toEqual([
			'src/playerRun.acceptance.feature',
		]);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: 'src/playerRun.acceptance.feature',
					ruleViolated: 'misplaced-acceptance-artifact',
				}),
				expect.objectContaining({
					path: 'src/acceptance/tests',
					ruleViolated: 'missing-required-directory',
				}),
			]),
		);
	});

	it('throws when review is not completed before dependency validation', () => {
		expect(() =>
			runCleanerWorkflow({
				reviewCompleted: false,
				directoryStructure: PASSING_DIRECTORY_STRUCTURE,
				dependencyChecker: { passed: true, violations: [] },
			}),
		).toThrow('requires completed code review');
	});

	it('fails and blocks cleanup when dependency checker reports violations', () => {
		const result = runCleanerWorkflow({
			reviewCompleted: true,
			directoryStructure: PASSING_DIRECTORY_STRUCTURE,
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
			directoryStructure: PASSING_DIRECTORY_STRUCTURE,
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
			directoryStructure: PASSING_DIRECTORY_STRUCTURE,
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
			directoryStructure: PASSING_DIRECTORY_STRUCTURE,
			dependencyChecker: {
				passed: true,
				violations: [],
			},
		});

		expect(result.report.dependencyChecker.summary).toContain(
			'0 discovered dependency(ies) and 0 unlisted.',
		);
	});

	it('fails and blocks cleanup when directory structure has critical violations', () => {
		const failingDirectoryStructure = assessDirectoryStructure({
			requiredDirectories: ['src/acceptance/features'],
			existingDirectories: [],
			repositoryPaths: ['src/playerRun.acceptance.feature'],
		});

		const result = runCleanerWorkflow({
			reviewCompleted: true,
			directoryStructure: failingDirectoryStructure,
			dependencyChecker: { passed: true, violations: [] },
		});

		expect(result.status).toBe('failed');
		expect(result.cleanupExecuted).toBe(false);
		expect(result.report.directoryStructure.status).toBe('failed');
		expect(result.report.directoryStructure.summary).toContain('failed');
		expect(result.report.directoryStructure.findings.length).toBeGreaterThan(0);
	});
});
