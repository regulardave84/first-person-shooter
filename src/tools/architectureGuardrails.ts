export type SpecificationLayerValidation = {
	passed: boolean;
	violations: string[];
};

export type ImplementerScenarioMapping = {
	scenario: string;
	modulePath: string;
	responsibility: string;
};

export type ImplementerLayerValidation = {
	passed: boolean;
	violations: string[];
	byModule: Array<{
		modulePath: string;
		responsibilities: string[];
	}>;
};

export type CiSourceFileStat = {
	filePath: string;
	lineCount: number;
};

export type CiLayerValidation = {
	passed: boolean;
	violations: string[];
	oversizedFiles: CiSourceFileStat[];
};

export function validateSpecificationLayerContract(
	acceptanceCriteriaText: string,
): SpecificationLayerValidation {
	const normalized = acceptanceCriteriaText.toLowerCase();
	const violations: string[] = [];

	if (!hasModuleBoundaryConstraint(normalized)) {
		violations.push(
			'Specification must include explicit module-boundary expectations.',
		);
	}

	if (!hasAggregatorProtectionConstraint(normalized)) {
		violations.push(
			'Specification must explicitly forbid adding feature logic to aggregator files.',
		);
	}

	return {
		passed: violations.length === 0,
		violations,
	};
}

function hasModuleBoundaryConstraint(text: string): boolean {
	return /module[-\s]boundar(y|ies)|single reasons? to change|focused modules?/.test(
		text,
	);
}

function hasAggregatorProtectionConstraint(text: string): boolean {
	return /(forbid|forbidden|reject|not)\b[^\n]*\b(aggregator|barrel)\s+files?/.test(
		text,
	);
}

export function validateImplementerLayerMappings(
	mappings: ImplementerScenarioMapping[],
): ImplementerLayerValidation {
	const violations: string[] = [];
	const responsibilitiesByModule = new Map<string, Set<string>>();

	for (const mapping of mappings) {
		if (!mapping.scenario.trim()) {
			violations.push(
				'Implementer mapping must include a non-empty scenario name.',
			);
		}
		if (!mapping.modulePath.trim()) {
			violations.push(
				`Implementer mapping for scenario "${mapping.scenario}" must include a target module path.`,
			);
			continue;
		}
		if (!mapping.responsibility.trim()) {
			violations.push(
				`Implementer mapping for scenario "${mapping.scenario}" must include a responsibility description.`,
			);
			continue;
		}

		const modulePath = mapping.modulePath.trim();
		const responsibility = mapping.responsibility.trim().toLowerCase();
		const bucket = responsibilitiesByModule.get(modulePath) ?? new Set<string>();
		bucket.add(responsibility);
		responsibilitiesByModule.set(modulePath, bucket);
	}

	for (const [modulePath, responsibilities] of responsibilitiesByModule.entries()) {
		if (responsibilities.size > 1) {
			violations.push(
				`Module ${modulePath} has multiple responsibilities: ${[...responsibilities].sort((a, b) => a.localeCompare(b)).join(', ')}`,
			);
		}
	}

	const byModule = [...responsibilitiesByModule.entries()]
		.map(([modulePath, responsibilities]) => ({
			modulePath,
			responsibilities: [...responsibilities].sort((a, b) =>
				a.localeCompare(b),
			),
		}))
		.sort((a, b) => a.modulePath.localeCompare(b.modulePath));

	return {
		passed: violations.length === 0,
		violations,
		byModule,
	};
}

export function evaluateCiLayerArchitectureGate(params: {
	sourceFiles: CiSourceFileStat[];
	maxSourceFileLines: number;
	importBoundaryViolations: string[];
	dependencyRuleViolations: string[];
}): CiLayerValidation {
	const oversizedFiles = params.sourceFiles
		.filter((file) => file.lineCount > params.maxSourceFileLines)
		.sort((a, b) => a.filePath.localeCompare(b.filePath));

	const violations = oversizedFiles.map(
		(file) =>
			`${file.filePath} exceeds max source file length (${file.lineCount} > ${params.maxSourceFileLines}).`,
	);

	for (const violation of params.importBoundaryViolations) {
		violations.push(`Import boundary violation: ${violation}`);
	}

	for (const violation of params.dependencyRuleViolations) {
		violations.push(`Dependency rule violation: ${violation}`);
	}

	return {
		passed: violations.length === 0,
		violations,
		oversizedFiles,
	};
}
