export type CleanerWorkflowStage =
	| 'directory-structure-assessment'
	| 'review'
	| 'dependency-check'
	| 'cleanup';

export type DirectoryStructureRule =
	| 'missing-required-directory'
	| 'misplaced-acceptance-artifact';

export type DirectoryStructureFinding = {
	path: string;
	ruleViolated: DirectoryStructureRule;
	recommendedAction: string;
	severity: 'critical' | 'warning';
};

export type DirectoryStructureOutcome = {
	passed: boolean;
	missingRequiredDirectories: string[];
	misplacedAcceptanceArtifacts: string[];
	findings: DirectoryStructureFinding[];
};

export type DependencyCheckerOutcome = {
	passed: boolean;
	violations: string[];
	findings?: {
		discovered?: string[];
		unlisted?: string[];
	};
};

export type CleanerWorkflowReport = {
	directoryStructure: {
		status: 'passed' | 'failed';
		missingRequiredDirectories: string[];
		misplacedAcceptanceArtifacts: string[];
		findings: DirectoryStructureFinding[];
		summary: string;
	};
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
	'directory-structure-assessment',
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

function isPathUnder(path: string, root: string): boolean {
	return path === root || path.startsWith(`${root}/`);
}

function isAcceptanceArtifactPath(path: string): boolean {
	return (
		path.endsWith('.acceptance.feature') ||
		path.endsWith('.acceptance.test.ts') ||
		path.endsWith('.acceptance.generated.test.ts') ||
		path.endsWith('.qa-procedure.md')
	);
}

function isArtifactPathCompliant(path: string): boolean {
	if (path.endsWith('.acceptance.feature')) {
		return isPathUnder(path, 'src/acceptance/features');
	}

	if (path.endsWith('.acceptance.generated.test.ts')) {
		return isPathUnder(path, 'src/acceptance/tests/generated');
	}

	if (path.endsWith('.acceptance.test.ts')) {
		return isPathUnder(path, 'src/acceptance/tests');
	}

	if (path.endsWith('.qa-procedure.md')) {
		return isPathUnder(path, 'src/acceptance/qa');
	}

	return true;
}

export function assessDirectoryStructure(params: {
	requiredDirectories: readonly string[];
	existingDirectories: readonly string[];
	repositoryPaths: readonly string[];
}): DirectoryStructureOutcome {
	const requiredDirectories = toUniqueSorted(params.requiredDirectories);
	const existingDirectories = new Set(toUniqueSorted(params.existingDirectories));
	const repositoryPaths = toUniqueSorted(params.repositoryPaths);

	const missingRequiredDirectories = requiredDirectories.filter(
		(directory) => !existingDirectories.has(directory),
	);

	const misplacedAcceptanceArtifacts = repositoryPaths
		.filter((path) => isAcceptanceArtifactPath(path))
		.filter((path) => !isArtifactPathCompliant(path));

	const findings: DirectoryStructureFinding[] = [
		...missingRequiredDirectories.map((path) => ({
			path,
			ruleViolated: 'missing-required-directory' as const,
			recommendedAction: `Create required directory: ${path}`,
			severity: 'critical' as const,
		})),
		...misplacedAcceptanceArtifacts.map((path) => ({
			path,
			ruleViolated: 'misplaced-acceptance-artifact' as const,
			recommendedAction:
				'Move acceptance artifact into src/acceptance/features, src/acceptance/tests, src/acceptance/tests/generated, or src/acceptance/qa as appropriate.',
			severity: 'critical' as const,
		})),
	].sort((a, b) => a.path.localeCompare(b.path));

	return {
		passed: findings.length === 0,
		missingRequiredDirectories,
		misplacedAcceptanceArtifacts,
		findings,
	};
}

function buildDirectoryStructureReport(
	directoryStructure: DirectoryStructureOutcome,
): CleanerWorkflowReport['directoryStructure'] {
	const sortedFindings = [...directoryStructure.findings].sort((a, b) =>
		a.path.localeCompare(b.path),
	);
	const status: 'passed' | 'failed' = directoryStructure.passed
		? 'passed'
		: 'failed';
	const summary = directoryStructure.passed
		? 'directory-structure-assessment passed with no violations.'
		: `directory-structure-assessment failed with ${sortedFindings.length} issue(s).`;

	return {
		status,
		missingRequiredDirectories: [...directoryStructure.missingRequiredDirectories],
		misplacedAcceptanceArtifacts: [...directoryStructure.misplacedAcceptanceArtifacts],
		findings: sortedFindings,
		summary,
	};
}

function buildDependencyCheckerReport(
	dependencyChecker: DependencyCheckerOutcome,
): CleanerWorkflowReport['dependencyChecker'] {
	const violations = toUniqueSorted(dependencyChecker.violations);
	const hasViolations = violations.length > 0 || !dependencyChecker.passed;
	const discoveredCount = toUniqueSorted(
		dependencyChecker.findings?.discovered,
	).length;
	const unlistedCount = toUniqueSorted(dependencyChecker.findings?.unlisted).length;

	return {
		status: hasViolations ? 'failed' : 'passed',
		violations,
		summary: hasViolations
			? `dependency-check failed with ${violations.length} violation(s): ${violations.join(', ')}`
			: `dependency-check passed with ${discoveredCount} discovered dependency(ies) and ${unlistedCount} unlisted.`,
	};
}

export function runCleanerWorkflow(params: {
	reviewCompleted: boolean;
	directoryStructure: DirectoryStructureOutcome;
	dependencyChecker: DependencyCheckerOutcome;
}): CleanerWorkflowResult {
	if (!params.reviewCompleted) {
		throw new Error(
			'Cleaner workflow requires completed code review before dependency validation.',
		);
	}

	const stages = getCleanerWorkflowOrder();
	const directoryStructureReport = buildDirectoryStructureReport(
		params.directoryStructure,
	);
	const dependencyCheckerReport = buildDependencyCheckerReport(
		params.dependencyChecker,
	);
	const status: 'passed' | 'failed' =
		directoryStructureReport.status === 'passed' &&
		dependencyCheckerReport.status === 'passed'
			? 'passed'
			: 'failed';

	const report: CleanerWorkflowReport = {
		directoryStructure: directoryStructureReport,
		dependencyChecker: dependencyCheckerReport,
	};

	return {
		stages,
		status,
		cleanupExecuted: status === 'passed',
		report,
	};
}
