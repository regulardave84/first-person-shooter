export type CoverageMetricName =
	| 'lines'
	| 'functions'
	| 'statements'
	| 'branches';

export type CoverageThresholds = Record<CoverageMetricName, number>;

export type CoverageEvaluationResult = {
	passed: boolean;
	violations: string[];
};

export function evaluateCoverageThresholds(
	actual: CoverageThresholds,
	required: CoverageThresholds,
): CoverageEvaluationResult {
	const metricOrder: CoverageMetricName[] = [
		'lines',
		'functions',
		'statements',
		'branches',
	];

	const violations: string[] = [];
	for (const metric of metricOrder) {
		if (actual[metric] < required[metric]) {
			violations.push(
				`Coverage for ${metric} (${actual[metric].toFixed(2)}%) does not meet global threshold (${required[metric].toFixed(2)}%)`,
			);
		}
	}

	return {
		passed: violations.length === 0,
		violations,
	};
}

export function hasCoverageThresholdOverrides(command: string): boolean {
	return /--coverage\.thresholds\./.test(command);
}
