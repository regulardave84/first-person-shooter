import { describe, expect, it } from 'vitest';
import {
	applyMutationTargetsToConfig,
	buildMutationScope,
	createMutationScopeSummary,
	evaluateMutationExecutionGate,
	HARDENER_FULL_TEST_SUITE_COMMAND,
	isImplementationSourceFile,
} from './tools/hardenerMutationScope';

describe('hardenerMutationScope', () => {
	it('identifies implementation source files under src', () => {
		expect(isImplementationSourceFile('src/runtime/fpsRuntime.ts')).toBe(true);
		expect(isImplementationSourceFile('src/runtime/fpsRuntime.test.ts')).toBe(
			false,
		);
		expect(
			isImplementationSourceFile('src/runtime/fpsRuntime.acceptance.test.ts'),
		).toBe(false);
		expect(isImplementationSourceFile('README.md')).toBe(false);
	});

	it('builds a ready scope using only changed implementation files', () => {
		const report = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: [
				'src/runtime/fpsRuntime.ts',
				'src/fpsRuntime.test.ts',
				'README.md',
			],
		});

		expect(report.status).toBe('ready');
		expect(report.mutateTargets).toEqual(['src/runtime/fpsRuntime.ts']);
	});

	it('builds a skipped scope when no implementation files changed', () => {
		const report = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: ['src/fpsRuntime.test.ts', 'README.md'],
		});

		expect(report.status).toBe('skipped');
		expect(report.mutateTargets).toEqual([]);
		expect(report.reason).toContain('Mutation testing was skipped');
	});

	it('applies sorted unique mutate targets to stryker config', () => {
		const scoped = applyMutationTargetsToConfig(
			{ testRunner: 'command', mutate: ['src/gameLogic.ts'] },
			['src/b.ts', 'src/a.ts', 'src/b.ts'],
		);

		expect(scoped.mutate).toEqual(['src/a.ts', 'src/b.ts']);
		expect(scoped.testRunner).toBe('command');
	});

	it('creates traceable scope summary text', () => {
		const summary = createMutationScopeSummary({
			status: 'ready',
			baseBranch: 'origin/main',
			changedFilesConsidered: ['src/a.ts', 'src/a.test.ts'],
			mutateTargets: ['src/a.ts'],
		});

		expect(summary).toContain('Base branch: origin/main');
		expect(summary).toContain(
			'Changed files considered: src/a.ts, src/a.test.ts',
		);
		expect(summary).toContain('Mutate targets: src/a.ts');
	});

	it('creates skipped summary text with explicit reason and empty lists', () => {
		const summary = createMutationScopeSummary({
			status: 'skipped',
			baseBranch: 'origin/main',
			changedFilesConsidered: [],
			mutateTargets: [],
			reason:
				'No changed implementation source files under src were found. Mutation testing was skipped.',
		});

		expect(summary).toContain('Mutation scope status: skipped');
		expect(summary).toContain('Changed files considered: (none)');
		expect(summary).toContain('Mutate targets: (none)');
		expect(summary).toContain(
			'Reason: No changed implementation source files under src were found. Mutation testing was skipped.',
		);
	});

	it('blocks mutation execution when full test suite fails', () => {
		const gate = evaluateMutationExecutionGate({
			scope: {
				status: 'ready',
				baseBranch: 'origin/main',
				changedFilesConsidered: ['src/runtime/fpsRuntime.ts'],
				mutateTargets: ['src/runtime/fpsRuntime.ts'],
			},
			fullTestSuitePassed: false,
		});

		expect(gate.status).toBe('blocked');
		expect(gate.shouldRunMutation).toBe(false);
		expect(gate.reason).toContain('full test suite failed');
		expect(gate.fullTestSuiteCommand).toBe(HARDENER_FULL_TEST_SUITE_COMMAND);
	});

	it('allows mutation execution only after full suite pass and ready scope', () => {
		const gate = evaluateMutationExecutionGate({
			scope: {
				status: 'ready',
				baseBranch: 'origin/main',
				changedFilesConsidered: ['src/runtime/fpsRuntime.ts'],
				mutateTargets: ['src/runtime/fpsRuntime.ts'],
			},
			fullTestSuitePassed: true,
		});

		expect(gate.status).toBe('ready');
		expect(gate.shouldRunMutation).toBe(true);
		expect(gate.fullTestSuiteCommand).toBe(HARDENER_FULL_TEST_SUITE_COMMAND);
	});

	it('keeps mutation skipped when scope is skipped even if full suite passes', () => {
		const gate = evaluateMutationExecutionGate({
			scope: {
				status: 'skipped',
				baseBranch: 'origin/main',
				changedFilesConsidered: ['README.md'],
				mutateTargets: [],
				reason:
					'No changed implementation source files under src were found. Mutation testing was skipped.',
			},
			fullTestSuitePassed: true,
		});

		expect(gate.status).toBe('skipped');
		expect(gate.shouldRunMutation).toBe(false);
		expect(gate.reason).toContain('Mutation testing was skipped');
	});

	it('keeps mutation blocked when scope is blocked even if full suite passes', () => {
		const gate = evaluateMutationExecutionGate({
			scope: {
				status: 'blocked',
				baseBranch: 'origin/main',
				changedFilesConsidered: ['src/runtime/fpsRuntime.ts'],
				mutateTargets: ['src/runtime/fpsRuntime.ts'],
				reason: 'Scope blocked by policy.',
			},
			fullTestSuitePassed: true,
		});

		expect(gate.status).toBe('blocked');
		expect(gate.shouldRunMutation).toBe(false);
		expect(gate.reason).toBe('Scope blocked by policy.');
		expect(gate.fullTestSuiteCommand).toBe(HARDENER_FULL_TEST_SUITE_COMMAND);
	});
});
