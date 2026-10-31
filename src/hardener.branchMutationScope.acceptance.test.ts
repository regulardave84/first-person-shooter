import { describe, expect, it } from 'vitest';
import {
	applyMutationTargetsToConfig,
	buildMutationScope,
	createMutationScopeSummary,
} from './tools/hardenerMutationScope';

describe('Acceptance: Hardener scopes mutation testing to current branch changes', () => {
	it('Select changed implementation files as mutation targets', () => {
		const report = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: ['src/runtime/fpsRuntime.ts', 'src/core/gameLogic.ts'],
		});

		expect(report.mutateTargets).toEqual([
			'src/core/gameLogic.ts',
			'src/runtime/fpsRuntime.ts',
		]);
	});

	it('Exclude non-implementation files from mutation target list', () => {
		const report = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: [
				'src/fpsRuntime.test.ts',
				'src/fpsRuntime.acceptance.test.ts',
				'README.md',
			],
		});

		expect(report.mutateTargets).toEqual([]);
		const mixedReport = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: ['src/runtime/fpsRuntime.ts', 'README.md'],
		});
		expect(mixedReport.mutateTargets).toEqual(['src/runtime/fpsRuntime.ts']);
	});

	it('Fallback when no implementation files changed', () => {
		const report = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: ['docs/notes.md', 'src/specifier.test.ts'],
		});

		expect(report.status).toBe('blocked');
		expect(report.reason).toContain('No changed implementation source files');
	});

	it('Run mutation command with branch-scoped mutate configuration', () => {
		const report = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: ['src/tools/dependencyChecker.ts'],
		});
		const scopedConfig = applyMutationTargetsToConfig(
			{ mutate: ['src/gameLogic.ts'], testRunner: 'command' },
			report.mutateTargets,
		);

		expect(scopedConfig.mutate).toEqual(['src/tools/dependencyChecker.ts']);
	});

	it('Report mutation scope for traceability', () => {
		const report = buildMutationScope({
			baseBranch: 'origin/main',
			changedFiles: ['src/runtime/fpsRuntime.ts', 'src/fpsRuntime.test.ts'],
		});
		const summary = createMutationScopeSummary(report);

		expect(summary).toContain('Base branch: origin/main');
		expect(summary).toContain(
			'Changed files considered: src/fpsRuntime.test.ts, src/runtime/fpsRuntime.ts',
		);
		expect(summary).toContain('Mutate targets: src/runtime/fpsRuntime.ts');
	});
});
