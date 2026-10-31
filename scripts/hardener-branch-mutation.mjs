import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const STRYKER_CONFIG_PATH = path.join(ROOT, 'stryker.conf.json');
const SCOPED_CONFIG_PATH = path.join(ROOT, '.stryker-branch.conf.json');
const REPORT_DIR = path.join(ROOT, 'reports', 'hardener');
const REPORT_PATH = path.join(REPORT_DIR, 'MUTATION_SCOPE_REPORT.md');
const FULL_TEST_SUITE_COMMAND = ['run', 'test:all'];

const IMPLEMENTATION_SOURCE_PATTERN = /^src\/.*\.ts$/;
const IGNORED_SOURCE_PATTERNS = [
	/\.test\.ts$/,
	/\.acceptance\.test\.ts$/,
	/\.acceptance\.generated\.test\.ts$/,
];

function runGit(args) {
	return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function normalizePath(filePath) {
	return filePath.replace(/\\/g, '/');
}

function uniqueSorted(values) {
	return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function isImplementationSourceFile(filePath) {
	const normalized = normalizePath(filePath);
	if (!IMPLEMENTATION_SOURCE_PATTERN.test(normalized)) {
		return false;
	}

	return !IGNORED_SOURCE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function detectBaseBranch() {
	const explicitBase = process.env.HARDENER_BASE_BRANCH;
	if (explicitBase) {
		return explicitBase;
	}

	const candidates = ['origin/main', 'main'];
	for (const candidate of candidates) {
		try {
			runGit(['rev-parse', '--verify', candidate]);
			return candidate;
		} catch {
			// Continue searching.
		}
	}

	throw new Error(
		'Unable to determine base branch. Set HARDENER_BASE_BRANCH environment variable.',
	);
}

function getChangedFiles(baseBranch) {
	const baseOutput = runGit([
		'diff',
		'--name-only',
		'--diff-filter=ACMRTUXB',
		`${baseBranch}...HEAD`,
	]);
	const stagedOutput = runGit(['diff', '--name-only', '--cached']);
	const unstagedOutput = runGit(['diff', '--name-only']);

	const mergedOutput = [baseOutput, stagedOutput, unstagedOutput]
		.filter(Boolean)
		.join('\n');

	if (!mergedOutput) {
		return [];
	}

	return uniqueSorted(
		mergedOutput
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean)
			.map(normalizePath),
	);
}

function buildScope(baseBranch, changedFiles) {
	const changedFilesConsidered = uniqueSorted(changedFiles);
	const mutateTargets = changedFilesConsidered.filter(
		isImplementationSourceFile,
	);

	if (mutateTargets.length === 0) {
		return {
			status: 'blocked',
			baseBranch,
			changedFilesConsidered,
			mutateTargets,
			reason:
				'No changed implementation source files under src were found for mutation scope.',
		};
	}

	return {
		status: 'ready',
		baseBranch,
		changedFilesConsidered,
		mutateTargets,
	};
}

function logScope(scope) {
	console.log(`Mutation scope status: ${scope.status}`);
	console.log(`Base branch: ${scope.baseBranch}`);
	console.log(
		`Changed files considered: ${scope.changedFilesConsidered.join(', ') || '(none)'}`,
	);
	console.log(`Mutate targets: ${scope.mutateTargets.join(', ') || '(none)'}`);
	if (scope.reason) {
		console.log(`Reason: ${scope.reason}`);
	}
}

function writeScopeReportWithGate(
	scope,
	{
		testSuiteStatus,
		testSuiteCommand,
		testSuiteFailureReason,
		blockReason,
	} = {},
) {
	const lines = [
		'# Mutation Scope Report',
		'',
		`- Status: ${scope.status.toUpperCase()}`,
		`- Base branch: ${scope.baseBranch}`,
		`- Changed files considered: ${scope.changedFilesConsidered.length}`,
		`- Mutate targets: ${scope.mutateTargets.length}`,
		`- Full test suite gate: ${(testSuiteStatus ?? 'not-run').toUpperCase()}`,
		'',
		'## Full test suite gate',
		'',
		`- Command: ${testSuiteCommand ?? `npm ${FULL_TEST_SUITE_COMMAND.join(' ')}`}`,
		`- Status: ${(testSuiteStatus ?? 'not-run').toUpperCase()}`,
		...(testSuiteFailureReason
			? [`- Failure reason: ${testSuiteFailureReason}`]
			: []),
		'',
		'## Changed files considered',
		'',
		...(scope.changedFilesConsidered.length > 0
			? scope.changedFilesConsidered.map((file) => `- ${file}`)
			: ['- (none)']),
		'',
		'## Mutate targets',
		'',
		...(scope.mutateTargets.length > 0
			? scope.mutateTargets.map((file) => `- ${file}`)
			: ['- (none)']),
	];

	const effectiveBlockReason = blockReason ?? scope.reason;
	if (effectiveBlockReason) {
		lines.push('', '## Block reason', '', `- ${effectiveBlockReason}`);
	}

	mkdirSync(REPORT_DIR, { recursive: true });
	writeFileSync(REPORT_PATH, `${lines.join('\n')}\n`, 'utf8');
	console.log(
		`Mutation scope report written: ${path.relative(ROOT, REPORT_PATH)}`,
	);
}

function runFullTestSuite() {
	const commandText = `npm ${FULL_TEST_SUITE_COMMAND.join(' ')}`;
	console.log(`Running full test suite gate: ${commandText}`);

	try {
		execFileSync('npm', FULL_TEST_SUITE_COMMAND, {
			stdio: 'inherit',
		});
		return {
			passed: true,
			command: commandText,
		};
	} catch (error) {
		const failureReason =
			error instanceof Error ? error.message : 'Full test suite failed.';
		return {
			passed: false,
			command: commandText,
			failureReason,
		};
	}
}

function main() {
	const baseBranch = detectBaseBranch();
	const changedFiles = getChangedFiles(baseBranch);
	const scope = buildScope(baseBranch, changedFiles);

	logScope(scope);
	const testGate = runFullTestSuite();

	if (!testGate.passed) {
		const blockReason =
			'Mutation testing is blocked because the full test suite failed. Run npm run test:all and fix failing tests before mutation testing.';

		console.error(blockReason);
		writeScopeReportWithGate(scope, {
			testSuiteStatus: 'failed',
			testSuiteCommand: testGate.command,
			testSuiteFailureReason: testGate.failureReason,
			blockReason,
		});
		process.exitCode = 1;
		return;
	}

	if (scope.status === 'blocked') {
		writeScopeReportWithGate(scope, {
			testSuiteStatus: 'passed',
			testSuiteCommand: testGate.command,
		});
		process.exitCode = 1;
		return;
	}

	writeScopeReportWithGate(scope, {
		testSuiteStatus: 'passed',
		testSuiteCommand: testGate.command,
	});

	const baseConfig = JSON.parse(readFileSync(STRYKER_CONFIG_PATH, 'utf8'));
	const scopedConfig = {
		...baseConfig,
		mutate: scope.mutateTargets,
	};

	writeFileSync(
		SCOPED_CONFIG_PATH,
		`${JSON.stringify(scopedConfig, null, 2)}\n`,
	);
	console.log(
		`Running mutation tests with scoped config: ${path.relative(ROOT, SCOPED_CONFIG_PATH)}`,
	);

	execFileSync('npx', ['stryker', 'run', SCOPED_CONFIG_PATH], {
		stdio: 'inherit',
	});
}

main();
