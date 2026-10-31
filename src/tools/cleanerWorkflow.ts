export type CleanerWorkflowStage = 'review' | 'dependency-check' | 'cleanup';

export type DependencyCheckerOutcome = {
	passed: boolean;
	violations: string[];
	findings?: {
		discovered?: string[];
		unlisted?: string[];
	};
};

export type CleanerWorkflowReport = {
	dependencyChecker: {
		status: 'passed' | 'failed';
		violations: string[];
		summary: string;
	};
};

export type CleanerWorkflowResult = {
	stages: CleanerWorkflowStage[];
	status: 'passed' | 'failed';
	cleanupExecuted: boolean;
	report: CleanerWorkflowReport;
};

const CLEANER_WORKFLOW_ORDER: readonly CleanerWorkflowStage[] = [
	'review',
	'dependency-check',
	'cleanup',
];

function toUniqueSorted(values: readonly string[] | undefined): string[] {
	return Array.from(new Set(values ?? [])).sort((a, b) => a.localeCompare(b));
}

export function getCleanerWorkflowOrder(): CleanerWorkflowStage[] {
	return [...CLEANER_WORKFLOW_ORDER];
}

export function runCleanerWorkflow(params: {
	reviewCompleted: boolean;
	dependencyChecker: DependencyCheckerOutcome;
}): CleanerWorkflowResult {
	if (!params.reviewCompleted) {
		throw new Error(
			'Cleaner workflow requires completed code review before dependency validation.',
		);
	}

	const stages = getCleanerWorkflowOrder();
	const violations = toUniqueSorted(params.dependencyChecker.violations);
	const hasViolations =
		violations.length > 0 || !params.dependencyChecker.passed;
	const status: 'passed' | 'failed' = hasViolations ? 'failed' : 'passed';

	const discoveredCount = toUniqueSorted(
		params.dependencyChecker.findings?.discovered,
	).length;
	const unlistedCount = toUniqueSorted(
		params.dependencyChecker.findings?.unlisted,
	).length;

	const report: CleanerWorkflowReport = {
		dependencyChecker: {
			status,
			violations,
			summary:
				status === 'passed'
					? `dependency-check passed with ${discoveredCount} discovered dependency(ies) and ${unlistedCount} unlisted.`
					: `dependency-check failed with ${violations.length} violation(s): ${violations.join(', ')}`,
		},
	};

	return {
		stages,
		status,
		cleanupExecuted: status === 'passed',
		report,
	};
}
