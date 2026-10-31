import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const COVERAGE_SUMMARY_PATH = path.join(ROOT, 'coverage', 'coverage-summary.json');
const COVERAGE_FINAL_PATH = path.join(ROOT, 'coverage', 'coverage-final.json');
const REPORT_DIR = path.join(ROOT, 'reports', 'cleaner');
const REPORT_MD_PATH = path.join(REPORT_DIR, 'CRAP_REPORT.md');
const REPORT_JSON_PATH = path.join(REPORT_DIR, 'CRAP_REPORT.json');

const PRODUCTION_FILE_PATTERN = /^src\/.*\.ts$/;

function toPosixPath(inputPath) {
	return inputPath.split(path.sep).join('/');
}

function toRelativePosixPath(inputPath) {
	const relative = path.isAbsolute(inputPath)
		? path.relative(ROOT, inputPath)
		: inputPath;
	return toPosixPath(relative);
}

function isProductionSourceFile(filePath) {
	if (!PRODUCTION_FILE_PATTERN.test(filePath)) {
		return false;
	}
	return !filePath.endsWith('.test.ts') && !filePath.endsWith('.acceptance.test.ts');
}

function classifyRisk(crapScore) {
	if (crapScore >= 30) {
		return 'Very High';
	}
	if (crapScore >= 20) {
		return 'High';
	}
	if (crapScore >= 10) {
		return 'Moderate';
	}
	return 'Low';
}

function readCoverageByFile() {
	if (fs.existsSync(COVERAGE_SUMMARY_PATH)) {
		const summary = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf8'));
		const fileCoverage = new Map();
		for (const [rawPath, metrics] of Object.entries(summary)) {
			if (rawPath === 'total') {
				continue;
			}
			const relPath = toRelativePosixPath(rawPath);
			fileCoverage.set(relPath, Number(metrics?.lines?.pct ?? 0));
		}
		return fileCoverage;
	}

	if (fs.existsSync(COVERAGE_FINAL_PATH)) {
		const details = JSON.parse(fs.readFileSync(COVERAGE_FINAL_PATH, 'utf8'));
		const fileCoverage = new Map();
		for (const [rawPath, data] of Object.entries(details)) {
			const relPath = toRelativePosixPath(rawPath);
			const lineMap = data?.statementMap ?? {};
			const statementHits = data?.s ?? {};
			const total = Object.keys(lineMap).length;
			const covered = Object.keys(statementHits).filter(
				(key) => Number(statementHits[key]) > 0,
			).length;
			const pct = total === 0 ? 0 : (covered / total) * 100;
			fileCoverage.set(relPath, pct);
		}
		return fileCoverage;
	}

	throw new Error(
		'Coverage data not found. Run "npm run test:coverage" before CRAP analysis.',
	);
}

function runComplexityReport() {
	try {
		const output = execFileSync(
			'npx',
			[
				'eslint',
				'src/**/*.ts',
				'--format',
				'json',
				'--rule',
				'complexity:["error",0]',
			],
			{ encoding: 'utf8', shell: true },
		);
		return JSON.parse(output);
	} catch (error) {
		const fallback = String(error?.stdout ?? '');
		if (fallback.trim().startsWith('[')) {
			return JSON.parse(fallback);
		}
		throw error;
	}
}

function extractComplexityEntries(eslintJson) {
	const entries = [];
	const namedPattern = /Function '([^']+)' has a complexity of (\d+)/;
	const genericPattern = /complexity of (\d+)/;

	for (const fileResult of eslintJson) {
		const relPath = toRelativePosixPath(fileResult.filePath ?? '');
		if (!isProductionSourceFile(relPath)) {
			continue;
		}

		for (const message of fileResult.messages ?? []) {
			if (message.ruleId !== 'complexity') {
				continue;
			}
			const rawMessage = String(message.message ?? '');
			const namedMatch = rawMessage.match(namedPattern);
			const complexityMatch = rawMessage.match(genericPattern);
			if (!complexityMatch) {
				continue;
			}

			const functionName = namedMatch?.[1] ?? `${message.nodeType ?? 'Function'}@L${Number(message.line ?? 0)}`;
			entries.push({
				file: relPath,
				functionName,
				complexity: Number(complexityMatch[1]),
				line: Number(message.line ?? 0),
			});
		}
	}

	return entries;
}

function calculateCrap(complexity, coveragePct) {
	const coverage = Math.max(0, Math.min(1, coveragePct / 100));
	return complexity * complexity * Math.pow(1 - coverage, 3) + complexity;
}

function formatNumber(value) {
	return Number(value).toFixed(2);
}

function buildReport(entries, coverageByFile) {
	const withScores = entries
		.map((entry) => {
			const coveragePct = Number(coverageByFile.get(entry.file) ?? 0);
			const crap = calculateCrap(entry.complexity, coveragePct);
			return {
				...entry,
				coveragePct,
				crap,
				risk: classifyRisk(crap),
			};
		})
		.sort((a, b) => b.crap - a.crap);

	const totalFunctions = withScores.length;
	const averageCrap =
		totalFunctions === 0
			? 0
			: withScores.reduce((sum, item) => sum + item.crap, 0) / totalFunctions;
	const top = withScores[0] ?? null;

	const lines = [
		'# CRAP Report',
		'',
		'- Formula: $CRAP = C^2 \\times (1 - cov)^3 + C$',
		`- Functions analyzed: ${totalFunctions}`,
		`- Average CRAP: ${formatNumber(averageCrap)}`,
		`- Top hotspot: ${top ? `${top.file}:${top.line} (${top.functionName}) = ${formatNumber(top.crap)}` : 'n/a'}`,
		'',
		'## Hotspots (sorted desc)',
		'',
		'| File | Line | Function | Complexity | Coverage % (file) | CRAP | Risk |',
		'|---|---:|---|---:|---:|---:|---|',
	];

	for (const item of withScores) {
		lines.push(
			`| ${item.file} | ${item.line} | ${item.functionName} | ${item.complexity} | ${formatNumber(item.coveragePct)} | ${formatNumber(item.crap)} | ${item.risk} |`,
		);
	}

	return {
		rows: withScores,
		markdown: `${lines.join('\n')}\n`,
		summary: {
			totalFunctions,
			averageCrap,
			topHotspot: top,
		},
	};
}

function main() {
	const coverageByFile = readCoverageByFile();
	const eslintJson = runComplexityReport();
	const complexityEntries = extractComplexityEntries(eslintJson);
	const report = buildReport(complexityEntries, coverageByFile);

	fs.mkdirSync(REPORT_DIR, { recursive: true });
	fs.writeFileSync(REPORT_MD_PATH, report.markdown, 'utf8');
	fs.writeFileSync(
		REPORT_JSON_PATH,
		JSON.stringify({ summary: report.summary, rows: report.rows }, null, 2),
		'utf8',
	);

	console.log(`CRAP analysis complete: ${toRelativePosixPath(REPORT_MD_PATH)}`);
	if (report.summary.topHotspot) {
		const top = report.summary.topHotspot;
		console.log(
			`Top hotspot: ${top.file}:${top.line} ${top.functionName} -> CRAP ${formatNumber(calculateCrap(top.complexity, Number(coverageByFile.get(top.file) ?? 0)))}`,
		);
	}
}

main();
