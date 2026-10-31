import { describe, expect, it } from 'vitest';
import {
	applyMutationTargetsToConfig,
	buildMutationScope,
	createMutationScopeSummary,
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

	it('builds a blocked scope when no implementation files changed', () => {
		const report = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: ['src/fpsRuntime.test.ts', 'README.md'],
		});

		expect(report.status).toBe('blocked');
		expect(report.mutateTargets).toEqual([]);
		expect(report.reason).toContain('No changed implementation source files');
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
		expect(summary).toContain('Changed files considered: src/a.ts, src/a.test.ts');
		expect(summary).toContain('Mutate targets: src/a.ts');
	});
});
