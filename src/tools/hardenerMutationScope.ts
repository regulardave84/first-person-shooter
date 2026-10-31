const IMPLEMENTATION_SOURCE_PATTERN = /^src\/.*\.ts$/;

const IGNORED_SOURCE_PATTERNS = [
	/\.test\.ts$/,
	/\.acceptance\.test\.ts$/,
	/\.acceptance\.generated\.test\.ts$/,
];

export type MutationScopeStatus = 'ready' | 'blocked';

export type MutationScopeReport = {
	status: MutationScopeStatus;
	baseBranch: string;
	changedFilesConsidered: string[];
	mutateTargets: string[];
	reason?: string;
};

export const HARDENER_FULL_TEST_SUITE_COMMAND = 'npm run test:all';

export type MutationExecutionGate = {
	status: MutationScopeStatus;
	shouldRunMutation: boolean;
	reason?: string;
	fullTestSuiteCommand: string;
};

function normalizePath(filePath: string): string {
	return filePath.replace(/\\/g, '/');
}

function uniqueSorted(values: string[]): string[] {
	return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function isImplementationSourceFile(filePath: string): boolean {
	const normalized = normalizePath(filePath);
	if (!IMPLEMENTATION_SOURCE_PATTERN.test(normalized)) {
		return false;
	}

	return !IGNORED_SOURCE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function buildMutationScope(params: {
	baseBranch: string;
	changedFiles: string[];
}): MutationScopeReport {
	const changedFilesConsidered = uniqueSorted(
		params.changedFiles.map(normalizePath),
	);
	const mutateTargets = changedFilesConsidered.filter(
		isImplementationSourceFile,
	);

	if (mutateTargets.length === 0) {
		return {
			status: 'blocked',
			baseBranch: params.baseBranch,
			changedFilesConsidered,
			mutateTargets,
			reason:
				'No changed implementation source files under src were found for mutation scope.',
		};
	}

	return {
		status: 'ready',
		baseBranch: params.baseBranch,
		changedFilesConsidered,
		mutateTargets,
	};
}

export function applyMutationTargetsToConfig<T extends Record<string, unknown>>(
	strykerConfig: T,
	mutateTargets: string[],
): T {
	return {
		...strykerConfig,
		mutate: uniqueSorted(mutateTargets),
	};
}

export function createMutationScopeSummary(
	report: MutationScopeReport,
): string {
	const changed =
		report.changedFilesConsidered.length > 0
			? report.changedFilesConsidered.join(', ')
			: '(none)';
	const targets =
		report.mutateTargets.length > 0
			? report.mutateTargets.join(', ')
			: '(none)';

	const reason = report.reason ? `\nReason: ${report.reason}` : '';
	return (
		[
			`Mutation scope status: ${report.status}`,
			`Base branch: ${report.baseBranch}`,
			`Changed files considered: ${changed}`,
			`Mutate targets: ${targets}`,
		].join('\n') + reason
	);
}

export function evaluateMutationExecutionGate(params: {
	scope: MutationScopeReport;
	fullTestSuitePassed: boolean;
}): MutationExecutionGate {
	if (!params.fullTestSuitePassed) {
		return {
			status: 'blocked',
			shouldRunMutation: false,
			reason:
				'Mutation testing is blocked because the full test suite failed. Run npm run test:all and fix failing tests before mutation testing.',
			fullTestSuiteCommand: HARDENER_FULL_TEST_SUITE_COMMAND,
		};
	}

	if (params.scope.status === 'blocked') {
		return {
			status: 'blocked',
			shouldRunMutation: false,
			reason: params.scope.reason,
			fullTestSuiteCommand: HARDENER_FULL_TEST_SUITE_COMMAND,
		};
	}

	return {
		status: 'ready',
		shouldRunMutation: true,
		fullTestSuiteCommand: HARDENER_FULL_TEST_SUITE_COMMAND,
	};
}
