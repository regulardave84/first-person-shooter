export type FeatureWorkflowAgentPhase =
	| 'specifier'
	| 'implementer'
	| 'cleaner'
	| 'hardener';

export type FeatureWorkflowAgentStatus = 'passed' | 'failed' | 'blocked';

export type SpecifierAgentHandoff = {
	approvedAcceptanceArtifactPaths: string[];
	summary: string;
};

export type ImplementerAgentHandoff = {
	changedFiles: string[];
	verificationSummary: string;
	summary: string;
};

export type CleanerAgentHandoff = {
	mutationScopeInputs: string[];
	summary: string;
};

export type HardenerAgentHandoff = {
	summary: string;
	mutationScore?: number;
};

export type SpecifierAgentResult = {
	status: FeatureWorkflowAgentStatus;
	handoff: SpecifierAgentHandoff;
	reason?: string;
};

export type ImplementerAgentResult = {
	status: FeatureWorkflowAgentStatus;
	handoff: ImplementerAgentHandoff;
	reason?: string;
};

export type CleanerAgentResult = {
	status: FeatureWorkflowAgentStatus;
	handoff: CleanerAgentHandoff;
	reason?: string;
};

export type HardenerAgentResult = {
	status: FeatureWorkflowAgentStatus;
	handoff: HardenerAgentHandoff;
	reason?: string;
};

export type FeatureWorkflowAgentRunners = {
	runSpecifierAgent: () => SpecifierAgentResult;
	runImplementerAgent: (
		specifierHandoff: SpecifierAgentHandoff,
	) => ImplementerAgentResult;
	runCleanerAgent: (implementerHandoff: ImplementerAgentHandoff) => CleanerAgentResult;
	runHardenerAgent: (cleanerHandoff: CleanerAgentHandoff) => HardenerAgentResult;
};

export type PhaseExecutionReport = {
	phase: FeatureWorkflowAgentPhase;
	status: FeatureWorkflowAgentStatus;
	handoffSummary: string;
	reason?: string;
};

export type FeatureWorkflowAgentRunResult = {
	phaseOrder: FeatureWorkflowAgentPhase[];
	finalStatus: FeatureWorkflowAgentStatus;
	completedPhases: FeatureWorkflowAgentPhase[];
	blockingPhase?: FeatureWorkflowAgentPhase;
	blockingReason?: string;
	report: PhaseExecutionReport[];
};

const FEATURE_WORKFLOW_AGENT_ORDER: readonly FeatureWorkflowAgentPhase[] = [
	'specifier',
	'implementer',
	'cleaner',
	'hardener',
];

function hasNonEmptyItems(values: readonly string[]): boolean {
	return values.some((value) => value.trim().length > 0);
}

function ensureValidSpecifierHandoff(handoff: SpecifierAgentHandoff): void {
	if (!hasNonEmptyItems(handoff.approvedAcceptanceArtifactPaths)) {
		throw new Error(
			'Specifier handoff must include approved acceptance artifact references before implementer can start.',
		);
	}
}

function ensureValidImplementerHandoff(handoff: ImplementerAgentHandoff): void {
	if (!hasNonEmptyItems(handoff.changedFiles)) {
		throw new Error(
			'Implementer handoff must include changed-files summary before cleaner can start.',
		);
	}

	if (handoff.verificationSummary.trim().length === 0) {
		throw new Error(
			'Implementer handoff must include verification summary before cleaner can start.',
		);
	}
}

function ensureValidCleanerHandoff(handoff: CleanerAgentHandoff): void {
	if (!hasNonEmptyItems(handoff.mutationScopeInputs)) {
		throw new Error(
			'Cleaner handoff must include mutation-scope inputs before hardener can start.',
		);
	}
}

function toBlockingReason(reason: string | undefined, phase: FeatureWorkflowAgentPhase): string {
	if (reason && reason.trim().length > 0) {
		return reason;
	}

	return `Phase ${phase} reported a non-passed status.`;
}

export function getFeatureWorkflowAgentOrder(): FeatureWorkflowAgentPhase[] {
	return [...FEATURE_WORKFLOW_AGENT_ORDER];
}

export function runFeatureWorkflowWithAgents(
	runners: FeatureWorkflowAgentRunners,
): FeatureWorkflowAgentRunResult {
	const report: PhaseExecutionReport[] = [];
	const completedPhases: FeatureWorkflowAgentPhase[] = [];

	const specifierResult = runners.runSpecifierAgent();
	report.push({
		phase: 'specifier',
		status: specifierResult.status,
		handoffSummary: specifierResult.handoff.summary,
		reason: specifierResult.reason,
	});
	if (specifierResult.status !== 'passed') {
		return {
			phaseOrder: getFeatureWorkflowAgentOrder(),
			finalStatus: specifierResult.status,
			completedPhases,
			blockingPhase: 'specifier',
			blockingReason: toBlockingReason(specifierResult.reason, 'specifier'),
			report,
		};
	}
	ensureValidSpecifierHandoff(specifierResult.handoff);
	completedPhases.push('specifier');

	const implementerResult = runners.runImplementerAgent(specifierResult.handoff);
	report.push({
		phase: 'implementer',
		status: implementerResult.status,
		handoffSummary: implementerResult.handoff.summary,
		reason: implementerResult.reason,
	});
	if (implementerResult.status !== 'passed') {
		return {
			phaseOrder: getFeatureWorkflowAgentOrder(),
			finalStatus: implementerResult.status,
			completedPhases,
			blockingPhase: 'implementer',
			blockingReason: toBlockingReason(implementerResult.reason, 'implementer'),
			report,
		};
	}
	ensureValidImplementerHandoff(implementerResult.handoff);
	completedPhases.push('implementer');

	const cleanerResult = runners.runCleanerAgent(implementerResult.handoff);
	report.push({
		phase: 'cleaner',
		status: cleanerResult.status,
		handoffSummary: cleanerResult.handoff.summary,
		reason: cleanerResult.reason,
	});
	if (cleanerResult.status !== 'passed') {
		return {
			phaseOrder: getFeatureWorkflowAgentOrder(),
			finalStatus: cleanerResult.status,
			completedPhases,
			blockingPhase: 'cleaner',
			blockingReason: toBlockingReason(cleanerResult.reason, 'cleaner'),
			report,
		};
	}
	ensureValidCleanerHandoff(cleanerResult.handoff);
	completedPhases.push('cleaner');

	const hardenerResult = runners.runHardenerAgent(cleanerResult.handoff);
	report.push({
		phase: 'hardener',
		status: hardenerResult.status,
		handoffSummary: hardenerResult.handoff.summary,
		reason: hardenerResult.reason,
	});
	if (hardenerResult.status !== 'passed') {
		return {
			phaseOrder: getFeatureWorkflowAgentOrder(),
			finalStatus: hardenerResult.status,
			completedPhases,
			blockingPhase: 'hardener',
			blockingReason: toBlockingReason(hardenerResult.reason, 'hardener'),
			report,
		};
	}
	completedPhases.push('hardener');

	return {
		phaseOrder: getFeatureWorkflowAgentOrder(),
		finalStatus: 'passed',
		completedPhases,
		report,
	};
}
