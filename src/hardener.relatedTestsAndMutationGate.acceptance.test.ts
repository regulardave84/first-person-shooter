import { describe, expect, it } from 'vitest';
import {
	applyMutationTargetsToConfig,
	buildMutationScope,
	evaluateMutationExecutionGate,
	HARDENER_FULL_TEST_SUITE_COMMAND,
} from './tools/hardenerMutationScope';

describe('Acceptance: Hardener gates mutation runs by full test suite', () => {
	it('Identify branch changes against main', () => {
		const report = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: ['src/runtime/fpsRuntime.ts', 'README.md'],
		});

		expect(report.baseBranch).toBe('origin/main');
		expect(report.changedFilesConsidered).toEqual([
			'README.md',
			'src/runtime/fpsRuntime.ts',
		]);
	});

	it('Run the full test suite before mutation', () => {
		expect(HARDENER_FULL_TEST_SUITE_COMMAND).toBe('npm run test:all');
	});

	it('Block mutation when any test fails', () => {
		const report = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: ['src/runtime/fpsRuntime.ts'],
		});
		const gate = evaluateMutationExecutionGate({
			scope: report,
			fullTestSuitePassed: false,
		});

		expect(gate.status).toBe('blocked');
		expect(gate.shouldRunMutation).toBe(false);
		expect(gate.reason).toContain('full test suite failed');
	});

	it('Run branch-scoped mutation after full test suite passes', () => {
		const report = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: ['src/tools/dependencyChecker.ts'],
		});
		const gate = evaluateMutationExecutionGate({
			scope: report,
			fullTestSuitePassed: true,
		});

		expect(gate.shouldRunMutation).toBe(true);
		expect(report.mutateTargets).toEqual(['src/tools/dependencyChecker.ts']);
	});

	it('Mutation run executes only after full test pass gate', () => {
		const report = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: ['src/runtime/fpsRuntime.ts'],
		});
		const gate = evaluateMutationExecutionGate({
			scope: report,
			fullTestSuitePassed: true,
		});
		const scopedConfig = applyMutationTargetsToConfig(
			{ mutate: ['src/gameLogic.ts'], testRunner: 'command' },
			report.mutateTargets,
		);

		expect(gate.status).toBe('ready');
		expect(scopedConfig.mutate).toEqual(['src/runtime/fpsRuntime.ts']);
	});

	it('Mutation stays blocked when no implementation targets exist even after full suite pass', () => {
		const report = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: ['README.md', 'src/fpsRuntime.test.ts'],
		});
		const gate = evaluateMutationExecutionGate({
			scope: report,
			fullTestSuitePassed: true,
		});

		expect(gate.status).toBe('blocked');
		expect(gate.shouldRunMutation).toBe(false);
		expect(gate.reason).toContain('No changed implementation source files');
	});
});
