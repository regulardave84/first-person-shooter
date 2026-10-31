import {
	mkdirSync,
	readFileSync,
	readdirSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, 'src');
const policyPath = path.join(projectRoot, 'dependency-policy.json');
const cleanerReportDir = path.join(projectRoot, 'reports', 'cleaner');
const cleanerDependencyReportPath = path.join(
	cleanerReportDir,
	'DEPENDENCY_CHECK_REPORT.md',
);
const validExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const ignoredFilePatterns = [
	/\.test\.[cm]?[jt]sx?$/,
	/\.acceptance\.test\.[cm]?[jt]sx?$/,
	/\.acceptance\.generated\.test\.[cm]?[jt]sx?$/,
];

function uniqueSorted(values) {
	return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function normalizeDependencyName(specifier) {
	if (
		!specifier ||
		specifier.startsWith('.') ||
		specifier.startsWith('/') ||
		specifier.startsWith('node:') ||
		specifier.includes('://')
	) {
		return null;
	}

	if (specifier.startsWith('@')) {
		const segments = specifier.split('/');
		return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : specifier;
	}

	return specifier.split('/')[0] ?? null;
}

function extractDependencies(source) {
	const dependencies = new Set();
	const patterns = [
		/\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
		/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
		/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
	];

	for (const pattern of patterns) {
		for (const match of source.matchAll(pattern)) {
			const normalized = normalizeDependencyName(match[1]?.trim());
			if (normalized) {
				dependencies.add(normalized);
			}
		}
	}

	return uniqueSorted(dependencies);
}

function listSourceFiles(dirPath) {
	const entries = readdirSync(dirPath, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const entryPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			files.push(...listSourceFiles(entryPath));
			continue;
		}

		if (!entry.isFile()) {
			continue;
		}

		if (ignoredFilePatterns.some((pattern) => pattern.test(entry.name))) {
			continue;
		}

		if (validExtensions.has(path.extname(entry.name))) {
			files.push(entryPath);
		}
	}

	return files;
}

function loadPolicy() {
	const policyRaw = readFileSync(policyPath, 'utf8');
	const policy = JSON.parse(policyRaw);
	return {
		allowed: uniqueSorted(policy.allowed ?? []),
		disallowed: uniqueSorted(policy.disallowed ?? []),
		requireExplicitPermissionToModify:
			policy.requireExplicitPermissionToModify ?? true,
	};
}

function main() {
	if (!statSync(sourceRoot).isDirectory()) {
		throw new Error('Expected src directory for dependency scanning.');
	}

	const policy = loadPolicy();
	const files = listSourceFiles(sourceRoot);
	const discovered = uniqueSorted(
		files.flatMap((filePath) =>
			extractDependencies(readFileSync(filePath, 'utf8')),
		),
	);

	const allowedSet = new Set(policy.allowed);
	const disallowedSet = new Set(policy.disallowed);

	const disallowed = discovered.filter((dependency) =>
		disallowedSet.has(dependency),
	);
	const unlisted = discovered.filter(
		(dependency) =>
			!disallowedSet.has(dependency) && !allowedSet.has(dependency),
	);

	console.log('Dependency scan complete.');
	console.log(`Discovered: ${discovered.join(', ') || '(none)'}`);
	console.log(`Disallowed: ${disallowed.join(', ') || '(none)'}`);
	console.log(`Unlisted: ${unlisted.join(', ') || '(none)'}`);
	console.log(
		`Policy edits require explicit permission: ${policy.requireExplicitPermissionToModify ? 'yes' : 'no'}`,
	);

	const reportLines = [
		'# Dependency Check Report',
		'',
		`- Status: ${disallowed.length > 0 ? 'FAILED' : 'PASSED'}`,
		`- Policy edits require explicit permission: ${policy.requireExplicitPermissionToModify ? 'yes' : 'no'}`,
		`- Discovered dependencies: ${discovered.length}`,
		`- Disallowed dependencies: ${disallowed.length}`,
		`- Unlisted dependencies: ${unlisted.length}`,
		'',
		'## Details',
		'',
		`- Discovered: ${discovered.join(', ') || '(none)'}`,
		`- Disallowed: ${disallowed.join(', ') || '(none)'}`,
		`- Unlisted: ${unlisted.join(', ') || '(none)'}`,
	];

	mkdirSync(cleanerReportDir, { recursive: true });
	writeFileSync(
		cleanerDependencyReportPath,
		`${reportLines.join('\n')}\n`,
		'utf8',
	);
	console.log(
		`Dependency report written: ${path.relative(projectRoot, cleanerDependencyReportPath)}`,
	);

	if (disallowed.length > 0) {
		process.exitCode = 1;
	}
}

main();
