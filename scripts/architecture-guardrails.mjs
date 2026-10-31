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
const policyPath = path.join(
	projectRoot,
	'architecture-guardrails.policy.json',
);
const reportDir = path.join(projectRoot, 'reports', 'cleaner');
const reportPath = path.join(reportDir, 'ARCHITECTURE_GUARDRAILS_REPORT.md');
const validExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function toPosixPath(inputPath) {
	return inputPath.split(path.sep).join('/');
}

function toRelativePosixPath(inputPath) {
	return toPosixPath(path.relative(projectRoot, inputPath));
}

function uniqueSorted(values) {
	return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function readPolicy() {
	const raw = readFileSync(policyPath, 'utf8');
	const parsed = JSON.parse(raw);
	return {
		maxSourceFileLines: Number(parsed.maxSourceFileLines ?? 1000),
		barrelFiles: uniqueSorted(parsed.barrelFiles ?? []),
		ignoredFilePatterns: (parsed.ignoredFilePatterns ?? []).map(
			(value) => new RegExp(String(value)),
		),
	};
}

function listSourceFiles(dirPath, ignoredPatterns) {
	const entries = readdirSync(dirPath, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const entryPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			files.push(...listSourceFiles(entryPath, ignoredPatterns));
			continue;
		}

		if (!entry.isFile()) {
			continue;
		}

		const relative = toRelativePosixPath(entryPath);
		if (ignoredPatterns.some((pattern) => pattern.test(relative))) {
			continue;
		}

		if (validExtensions.has(path.extname(entry.name))) {
			files.push(entryPath);
		}
	}

	return files;
}

function countLines(source) {
	if (source.length === 0) {
		return 0;
	}
	return source.split(/\r?\n/).length;
}

function extractImportSpecifiers(source) {
	const discovered = [];
	const patterns = [
		/\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
		/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
		/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
	];

	for (const pattern of patterns) {
		for (const match of source.matchAll(pattern)) {
			const specifier = match[1]?.trim();
			if (specifier) {
				discovered.push(specifier);
			}
		}
	}

	return uniqueSorted(discovered);
}

function resolveRelativeSpecifier(filePath, specifier) {
	if (!specifier.startsWith('.')) {
		return null;
	}

	const basePath = path.resolve(path.dirname(filePath), specifier);
	const candidatePaths = [
		basePath,
		`${basePath}.ts`,
		`${basePath}.tsx`,
		`${basePath}.js`,
		`${basePath}.mjs`,
		path.join(basePath, 'index.ts'),
		path.join(basePath, 'index.tsx'),
		path.join(basePath, 'index.js'),
	];

	for (const candidate of candidatePaths) {
		try {
			if (statSync(candidate).isFile()) {
				return toRelativePosixPath(candidate);
			}
		} catch {
			// ignore missing candidate
		}
	}

	return null;
}

function findBarrelImportBoundaryViolations(scanByFile, barrelFiles) {
	const barrelSet = new Set(barrelFiles.map((entry) => toPosixPath(entry)));
	const violations = [];

	for (const entry of scanByFile) {
		const sourceFile = toPosixPath(entry.filePath);
		if (barrelSet.has(sourceFile)) {
			continue;
		}

		for (const specifier of entry.imports) {
			const resolved = resolveRelativeSpecifier(
				path.join(projectRoot, sourceFile),
				specifier,
			);
			if (!resolved) {
				continue;
			}

			if (barrelSet.has(resolved)) {
				violations.push(`${sourceFile} imports disallowed barrel ${resolved}`);
			}
		}
	}

	return uniqueSorted(violations);
}

function main() {
	if (!statSync(sourceRoot).isDirectory()) {
		throw new Error('Expected src directory for architecture guardrails scan.');
	}

	const policy = readPolicy();
	const files = listSourceFiles(sourceRoot, policy.ignoredFilePatterns);

	const scanByFile = files.map((filePath) => {
		const source = readFileSync(filePath, 'utf8');
		return {
			filePath: toRelativePosixPath(filePath),
			lineCount: countLines(source),
			imports: extractImportSpecifiers(source),
		};
	});

	const oversizedFiles = scanByFile
		.filter((entry) => entry.lineCount > policy.maxSourceFileLines)
		.map((entry) => ({ filePath: entry.filePath, lineCount: entry.lineCount }))
		.sort((a, b) => a.filePath.localeCompare(b.filePath));

	const importBoundaryViolations = findBarrelImportBoundaryViolations(
		scanByFile,
		policy.barrelFiles,
	);

	const violations = [
		...oversizedFiles.map(
			(file) =>
				`${file.filePath} exceeds max source file length (${file.lineCount} > ${policy.maxSourceFileLines}).`,
		),
		...importBoundaryViolations.map(
			(violation) => `Import boundary violation: ${violation}`,
		),
	];

	const status = violations.length === 0 ? 'PASSED' : 'FAILED';
	const reportLines = [
		'# Architecture Guardrails Report',
		'',
		`- Status: ${status}`,
		`- Max source file lines: ${policy.maxSourceFileLines}`,
		`- Scanned source files: ${scanByFile.length}`,
		`- Oversized files: ${oversizedFiles.length}`,
		`- Import boundary violations: ${importBoundaryViolations.length}`,
		'',
		'## Details',
		'',
		`- Oversized files: ${
			oversizedFiles
				.map((file) => `${file.filePath} (${file.lineCount})`)
				.join(', ') || '(none)'
		}`,
		`- Import boundary violations: ${importBoundaryViolations.join(', ') || '(none)'}`,
	];

	mkdirSync(reportDir, { recursive: true });
	writeFileSync(reportPath, `${reportLines.join('\n')}\n`, 'utf8');

	console.log('Architecture guardrails scan complete.');
	console.log(`Status: ${status}`);
	console.log(`Oversized files: ${oversizedFiles.length}`);
	console.log(`Import boundary violations: ${importBoundaryViolations.length}`);
	console.log(
		`Architecture report written: ${path.relative(projectRoot, reportPath)}`,
	);

	if (violations.length > 0) {
		for (const violation of violations) {
			console.error(violation);
		}
		process.exitCode = 1;
	}
}

main();
