export type SourceFile = {
	filePath: string;
	content: string;
};

export type DependencyPolicy = {
	allowed: string[];
	disallowed: string[];
	requireExplicitPermissionToModify?: boolean;
};

export type DependencyScanResult = {
	byFile: Array<{
		filePath: string;
		dependencies: string[];
	}>;
	discovered: string[];
};

export type DependencyClassification = {
	allowed: string[];
	disallowed: string[];
	unlisted: string[];
};

export type DependencyValidationResult = DependencyClassification & {
	passed: boolean;
	violations: string[];
};

export const DEFAULT_DEPENDENCY_POLICY: Required<DependencyPolicy> = {
	allowed: ['three', 'vitest'],
	disallowed: [],
	requireExplicitPermissionToModify: true,
};

const EXTERNAL_SPECIFIER_PATTERN = /^[A-Za-z@]/;

function uniqueSorted(values: Iterable<string>): string[] {
	return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function isBareModuleSpecifier(specifier: string): boolean {
	return (
		specifier.length > 0 &&
		!specifier.startsWith('.') &&
		!specifier.startsWith('/') &&
		!specifier.startsWith('node:') &&
		!specifier.includes('://') &&
		EXTERNAL_SPECIFIER_PATTERN.test(specifier)
	);
}

export function normalizeDependencyName(specifier: string): string | null {
	if (!isBareModuleSpecifier(specifier)) {
		return null;
	}

	if (specifier.startsWith('@')) {
		const segments = specifier.split('/');
		return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : specifier;
	}

	const [root] = specifier.split('/');
	return root ?? null;
}

function extractByPattern(
	pattern: RegExp,
	source: string,
	target: Set<string>,
): void {
	for (const match of source.matchAll(pattern)) {
		const rawSpecifier = match[1]?.trim();
		if (!rawSpecifier) {
			continue;
		}

		const normalized = normalizeDependencyName(rawSpecifier);
		if (normalized) {
			target.add(normalized);
		}
	}
}

export function extractDependenciesFromSource(source: string): string[] {
	const discovered = new Set<string>();

	extractByPattern(
		/\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
		source,
		discovered,
	);
	extractByPattern(
		/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
		source,
		discovered,
	);
	extractByPattern(
		/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
		source,
		discovered,
	);

	return uniqueSorted(discovered);
}

export function scanDependenciesInFiles(
	files: SourceFile[],
): DependencyScanResult {
	const byFile = files.map((file) => ({
		filePath: file.filePath,
		dependencies: extractDependenciesFromSource(file.content),
	}));

	const discovered = uniqueSorted(
		byFile.flatMap((entry) => entry.dependencies),
	);

	return { byFile, discovered };
}

export function normalizePolicy(
	policy: DependencyPolicy,
): Required<DependencyPolicy> {
	return {
		allowed: uniqueSorted(policy.allowed),
		disallowed: uniqueSorted(policy.disallowed),
		requireExplicitPermissionToModify:
			policy.requireExplicitPermissionToModify ?? true,
	};
}

export function classifyDependencies(
	discovered: string[],
	policy: DependencyPolicy,
): DependencyClassification {
	const normalizedPolicy = normalizePolicy(policy);
	const allowedSet = new Set(normalizedPolicy.allowed);
	const disallowedSet = new Set(normalizedPolicy.disallowed);

	const allowed: string[] = [];
	const disallowed: string[] = [];
	const unlisted: string[] = [];

	for (const dependency of uniqueSorted(discovered)) {
		if (disallowedSet.has(dependency)) {
			disallowed.push(dependency);
			continue;
		}

		if (allowedSet.has(dependency)) {
			allowed.push(dependency);
			continue;
		}

		unlisted.push(dependency);
	}

	return { allowed, disallowed, unlisted };
}

export function validateDependenciesAgainstPolicy(
	discovered: string[],
	policy: DependencyPolicy,
): DependencyValidationResult {
	const classified = classifyDependencies(discovered, policy);
	return {
		...classified,
		passed: classified.disallowed.length === 0,
		violations: [...classified.disallowed],
	};
}

export function updateDependencyPolicy(
	currentPolicy: DependencyPolicy,
	updates: Partial<Pick<DependencyPolicy, 'allowed' | 'disallowed'>>,
	options: { explicitPermissionGranted: boolean },
): Required<DependencyPolicy> {
	const normalizedCurrent = normalizePolicy(currentPolicy);

	if (
		normalizedCurrent.requireExplicitPermissionToModify &&
		!options.explicitPermissionGranted
	) {
		throw new Error(
			'Dependency policy changes require explicit permission before modification.',
		);
	}

	return normalizePolicy({
		allowed: updates.allowed ?? normalizedCurrent.allowed,
		disallowed: updates.disallowed ?? normalizedCurrent.disallowed,
		requireExplicitPermissionToModify:
			normalizedCurrent.requireExplicitPermissionToModify,
	});
}
