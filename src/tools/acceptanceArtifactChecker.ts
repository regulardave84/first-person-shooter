export type AcceptanceArtifactKind =
	| 'accepted-feature'
	| 'proposed-feature'
	| 'acceptance-test';

export type AcceptanceArtifact = {
	filePath: string;
	kind: AcceptanceArtifactKind;
	baseName: string;
	content?: string;
};

export type NormalizedNameCollision = {
	kind: AcceptanceArtifactKind;
	normalizedKey: string;
	filePaths: string[];
};

export type DuplicateAcceptedFeatureTitle = {
	normalizedTitle: string;
	entries: Array<{
		filePath: string;
		title: string;
	}>;
};

export type AcceptanceArtifactValidationResult = {
	passed: boolean;
	normalizedNameCollisions: NormalizedNameCollision[];
	duplicateAcceptedFeatureTitles: DuplicateAcceptedFeatureTitle[];
};

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function normalizeBase(baseName: string): string {
	return baseName.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeFeatureTitle(title: string): string {
	return title.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function classifyFeatureArtifactFromFileName(fileName: string): {
	kind: 'accepted-feature' | 'proposed-feature';
	baseName: string;
} | null {
	if (fileName.endsWith('.proposed.feature')) {
		return {
			kind: 'proposed-feature',
			baseName: fileName.slice(0, -'.proposed.feature'.length),
		};
	}

	if (fileName.endsWith('.acceptance.feature')) {
		return {
			kind: 'accepted-feature',
			baseName: fileName.slice(0, -'.acceptance.feature'.length),
		};
	}

	if (fileName.endsWith('.feature')) {
		return {
			kind: 'accepted-feature',
			baseName: fileName.slice(0, -'.feature'.length),
		};
	}

	return null;
}

export function classifyAcceptanceTestArtifactFromFileName(fileName: string): {
	kind: 'acceptance-test';
	baseName: string;
} | null {
	if (!fileName.endsWith('.acceptance.test.ts')) {
		return null;
	}

	return {
		kind: 'acceptance-test',
		baseName: fileName.slice(0, -'.acceptance.test.ts'.length),
	};
}

export function parseFeatureTitle(content: string): string | null {
	for (const line of content.split(/\r?\n/u)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}

		if (!trimmed.startsWith('Feature:')) {
			continue;
		}

		const title = trimmed.slice('Feature:'.length).trim();
		return title.length > 0 ? title : null;
	}

	return null;
}

export function findNormalizedNameCollisions(
	artifacts: AcceptanceArtifact[],
): NormalizedNameCollision[] {
	const byKindAndKey = new Map<string, string[]>();

	for (const artifact of artifacts) {
		const normalizedKey = normalizeBase(artifact.baseName);
		const key = `${artifact.kind}:${normalizedKey}`;
		const existing = byKindAndKey.get(key);

		if (existing) {
			existing.push(artifact.filePath);
			continue;
		}

		byKindAndKey.set(key, [artifact.filePath]);
	}

	return [...byKindAndKey.entries()]
		.filter(([, filePaths]) => filePaths.length > 1)
		.map(([kindAndKey, filePaths]) => {
			const [kind, normalizedKey] = kindAndKey.split(':');
			return {
				kind: kind as AcceptanceArtifactKind,
				normalizedKey,
				filePaths: uniqueSorted(filePaths),
			};
		})
		.sort((a, b) => `${a.kind}:${a.normalizedKey}`.localeCompare(`${b.kind}:${b.normalizedKey}`));
}

export function findDuplicateAcceptedFeatureTitles(
	featureArtifacts: AcceptanceArtifact[],
): DuplicateAcceptedFeatureTitle[] {
	const byTitle = new Map<string, Array<{ filePath: string; title: string }>>();

	for (const artifact of featureArtifacts) {
		if (artifact.kind !== 'accepted-feature' || !artifact.content) {
			continue;
		}

		const title = parseFeatureTitle(artifact.content);
		if (!title) {
			continue;
		}

		const normalizedTitle = normalizeFeatureTitle(title);
		const existing = byTitle.get(normalizedTitle);
		if (existing) {
			existing.push({ filePath: artifact.filePath, title });
			continue;
		}

		byTitle.set(normalizedTitle, [{ filePath: artifact.filePath, title }]);
	}

	return [...byTitle.entries()]
		.filter(([, entries]) => entries.length > 1)
		.map(([normalizedTitle, entries]) => ({
			normalizedTitle,
			entries: [...entries].sort((a, b) => a.filePath.localeCompare(b.filePath)),
		}))
		.sort((a, b) => a.normalizedTitle.localeCompare(b.normalizedTitle));
}

export function validateAcceptanceArtifacts(
	artifacts: AcceptanceArtifact[],
): AcceptanceArtifactValidationResult {
	const normalizedNameCollisions = findNormalizedNameCollisions(artifacts);
	const duplicateAcceptedFeatureTitles = findDuplicateAcceptedFeatureTitles(
		artifacts.filter(
			(artifact) =>
				artifact.kind === 'accepted-feature' ||
				artifact.kind === 'proposed-feature',
		),
	);

	return {
		passed:
			normalizedNameCollisions.length === 0 &&
			duplicateAcceptedFeatureTitles.length === 0,
		normalizedNameCollisions,
		duplicateAcceptedFeatureTitles,
	};
}
