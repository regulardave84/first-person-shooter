import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const FEATURES_DIR = path.join(ROOT, 'src', 'acceptance', 'features');
const TESTS_DIR = path.join(ROOT, 'src', 'acceptance', 'tests');
const REPORT_DIR = path.join(ROOT, 'reports', 'cleaner');
const REPORT_PATH = path.join(REPORT_DIR, 'ACCEPTANCE_ARTIFACT_REPORT.md');

function normalizePath(filePath) {
	return filePath.replace(/\\/g, '/');
}

function toRelative(filePath) {
	return normalizePath(path.relative(ROOT, filePath));
}

function normalizeBase(baseName) {
	return baseName.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function classifyFeatureFile(fileName) {
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

function classifyTestFile(fileName) {
	if (!fileName.endsWith('.acceptance.test.ts')) {
		return null;
	}

	return {
		kind: 'acceptance-test',
		baseName: fileName.slice(0, -'.acceptance.test.ts'.length),
	};
}

function listFilesRecursive(dirPath) {
	const entries = readdirSync(dirPath, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			files.push(...listFilesRecursive(fullPath));
			continue;
		}

		if (entry.isFile()) {
			files.push(fullPath);
		}
	}

	return files;
}

function findNormalizedNameCollisions(items) {
	const byKindAndKey = new Map();

	for (const item of items) {
		const key = `${item.kind}:${normalizeBase(item.baseName)}`;
		const existing = byKindAndKey.get(key);
		if (existing) {
			existing.push(item.filePath);
			continue;
		}

		byKindAndKey.set(key, [item.filePath]);
	}

	return [...byKindAndKey.entries()]
		.filter(([, filePaths]) => filePaths.length > 1)
		.map(([kindAndKey, filePaths]) => {
			const [kind, normalizedKey] = kindAndKey.split(':');
			return {
				kind,
				normalizedKey,
				filePaths: [...filePaths].sort((a, b) => a.localeCompare(b)),
			};
		})
		.sort((a, b) => `${a.kind}:${a.normalizedKey}`.localeCompare(`${b.kind}:${b.normalizedKey}`));
}

function parseFeatureTitle(content) {
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

function normalizeTitle(title) {
	return title.toLowerCase().replace(/\s+/g, ' ').trim();
}

function findDuplicateAcceptedFeatureTitles(featureFiles) {
	const byTitle = new Map();

	for (const featureFile of featureFiles) {
		if (featureFile.kind !== 'accepted-feature') {
			continue;
		}

		const title = parseFeatureTitle(featureFile.content);
		if (!title) {
			continue;
		}

		const normalized = normalizeTitle(title);
		const existing = byTitle.get(normalized);
		if (existing) {
			existing.push({ filePath: featureFile.filePath, title });
			continue;
		}

		byTitle.set(normalized, [{ filePath: featureFile.filePath, title }]);
	}

	return [...byTitle.entries()]
		.filter(([, entries]) => entries.length > 1)
		.map(([normalizedTitle, entries]) => ({
			normalizedTitle,
			entries: [...entries].sort((a, b) => a.filePath.localeCompare(b.filePath)),
		}))
		.sort((a, b) => a.normalizedTitle.localeCompare(b.normalizedTitle));
}

function main() {
	if (!statSync(FEATURES_DIR).isDirectory()) {
		throw new Error('Expected acceptance features directory.');
	}

	if (!statSync(TESTS_DIR).isDirectory()) {
		throw new Error('Expected acceptance tests directory.');
	}

	const featurePaths = listFilesRecursive(FEATURES_DIR)
		.filter((filePath) => filePath.endsWith('.feature'))
		.map((filePath) => normalizePath(filePath));

	const testPaths = listFilesRecursive(TESTS_DIR)
		.filter((filePath) => filePath.endsWith('.acceptance.test.ts'))
		.map((filePath) => normalizePath(filePath));

	const featureArtifacts = featurePaths
		.map((filePath) => {
			const fileName = path.basename(filePath);
			const classified = classifyFeatureFile(fileName);
			if (!classified) {
				return null;
			}
			return {
				...classified,
				filePath,
				content: readFileSync(filePath, 'utf8'),
			};
		})
		.filter(Boolean);

	const testArtifacts = testPaths
		.map((filePath) => {
			const fileName = path.basename(filePath);
			const classified = classifyTestFile(fileName);
			if (!classified) {
				return null;
			}
			return {
				...classified,
				filePath,
			};
		})
		.filter(Boolean);

	const allArtifacts = [...featureArtifacts, ...testArtifacts];
	const normalizedNameCollisions = findNormalizedNameCollisions(allArtifacts);
	const duplicateAcceptedFeatureTitles = findDuplicateAcceptedFeatureTitles(featureArtifacts);

	const passed =
		normalizedNameCollisions.length === 0 &&
		duplicateAcceptedFeatureTitles.length === 0;

	const reportLines = [
		'# Acceptance Artifact Report',
		'',
		`- Status: ${passed ? 'PASSED' : 'FAILED'}`,
		`- Feature files scanned: ${featureArtifacts.length}`,
		`- Acceptance test files scanned: ${testArtifacts.length}`,
		`- Normalized-name collisions: ${normalizedNameCollisions.length}`,
		`- Duplicate accepted feature titles: ${duplicateAcceptedFeatureTitles.length}`,
		'',
		'## Normalized-name collisions',
		'',
		...(normalizedNameCollisions.length === 0
			? ['- (none)']
			: normalizedNameCollisions.flatMap((collision) => [
				`- kind=${collision.kind}, key=${collision.normalizedKey}`,
				...collision.filePaths.map((filePath) => `  - ${toRelative(filePath)}`),
			])),
		'',
		'## Duplicate accepted feature titles',
		'',
		...(duplicateAcceptedFeatureTitles.length === 0
			? ['- (none)']
			: duplicateAcceptedFeatureTitles.flatMap((duplicate) => [
				`- title key=${duplicate.normalizedTitle}`,
				...duplicate.entries.map(
					(entry) => `  - ${toRelative(entry.filePath)} :: ${entry.title}`,
				),
			])),
	];

	mkdirSync(REPORT_DIR, { recursive: true });
	writeFileSync(REPORT_PATH, `${reportLines.join('\n')}\n`, 'utf8');

	console.log(`Acceptance artifact report written: ${toRelative(REPORT_PATH)}`);
	console.log(`Status: ${passed ? 'PASSED' : 'FAILED'}`);

	if (!passed) {
		process.exitCode = 1;
	}
}

main();
