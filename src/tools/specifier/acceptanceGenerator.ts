import type { GherkinScenario, GherkinStep, GherkinStepKeyword } from './types';
import { parseGherkinFeature } from './gherkinParser';

const STEP_KEYWORDS: ReadonlyArray<GherkinStepKeyword> = [
	'Given',
	'When',
	'Then',
	'And',
	'But',
];

const GIVEN_PREFIXES = ['given ', 'assuming ', 'with '];
const WHEN_PREFIXES = ['when ', 'if ', 'on ', 'after '];
const THEN_PREFIXES = [
	'then ',
	'should ',
	'must ',
	'expect ',
	'it should ',
	'it must ',
];

function isGherkinStepKeyword(value: string): value is GherkinStepKeyword {
	return STEP_KEYWORDS.includes(value as GherkinStepKeyword);
}

function normalizeLine(line: string): string {
	return line.trim().replace(/^[-*]\s+/, '');
}

function stepsToGherkin(steps: GherkinStep[]): string[] {
	return steps.map((step) => `    ${step.keyword} ${step.text}`);
}

function startsWithAny(value: string, prefixes: ReadonlyArray<string>): boolean {
	return prefixes.some((prefix) => value.startsWith(prefix));
}

function inferStepKeywordFromText(text: string): GherkinStepKeyword {
	const lower = text.trim().toLowerCase();

	if (startsWithAny(lower, GIVEN_PREFIXES)) {
		return 'Given';
	}
	if (startsWithAny(lower, WHEN_PREFIXES)) {
		return 'When';
	}
	if (startsWithAny(lower, THEN_PREFIXES)) {
		return 'Then';
	}

	return 'When';
}

function removeKeywordPrefix(text: string, keyword: string): string {
	const pattern = new RegExp(`^${keyword}\\s+`, 'i');
	return text.replace(pattern, '').trim();
}

function ensureGivenWhenThen(steps: GherkinStep[]): GherkinStep[] {
	const hasGiven = steps.some((step) => step.keyword === 'Given');
	const hasWhen = steps.some((step) => step.keyword === 'When');
	const hasThen = steps.some((step) => step.keyword === 'Then');

	const output = [...steps];

	if (!hasGiven) {
		output.unshift({
			keyword: 'Given',
			text: 'the system is in a valid initial state',
		});
	}

	if (!hasWhen) {
		output.splice(Math.min(1, output.length), 0, {
			keyword: 'When',
			text: 'the user performs the described action',
		});
	}

	if (!hasThen) {
		output.push({ keyword: 'Then', text: 'the expected outcome is observed' });
	}

	return output;
}

function toScenarioName(input: string, index: number): string {
	const normalized = input.trim().replace(/[.]+$/, '');
	if (normalized.length === 0) {
		return `Scenario ${index + 1}`;
	}

	if (normalized.length <= 80) {
		return normalized;
	}

	return `${normalized.slice(0, 77).trimEnd()}...`;
}

function parseHumanBlockIntoScenario(
	block: string,
	index: number,
): GherkinScenario {
	const rawLines = block
		.split(/\r?\n/)
		.map(normalizeLine)
		.filter((line) => line.length > 0);

	const scenarioLine = rawLines[0] ?? '';
	const hasScenarioPrefix = scenarioLine.toLowerCase().startsWith('scenario:');
	const maybeScenarioName = hasScenarioPrefix
		? scenarioLine.slice('scenario:'.length).trim()
		: scenarioLine;

	const stepLines =
		rawLines.length > 1 && hasScenarioPrefix
			? rawLines.slice(1)
			: rawLines;

	const mappedSteps: GherkinStep[] = stepLines.map((line) => {
		const splitAt = line.indexOf(' ');
		const firstWord = splitAt > -1 ? line.slice(0, splitAt) : line;

		if (isGherkinStepKeyword(firstWord)) {
			return {
				keyword: firstWord,
				text: removeKeywordPrefix(line, firstWord),
			};
		}

		const keyword = inferStepKeywordFromText(line);
		const content = removeKeywordPrefix(line, keyword);
		return {
			keyword,
			text: content.length > 0 ? content : line,
		};
	});

	const steps = ensureGivenWhenThen(mappedSteps);
	return { name: toScenarioName(maybeScenarioName, index), steps };
}

export function createAcceptanceTestsFromSpec(
	specification: string,
	featureName = 'Generated Feature',
): string {
	const trimmed = specification.trim();
	if (trimmed.length === 0) {
		throw new Error('Specification cannot be empty.');
	}

	if (trimmed.includes('Feature:') && trimmed.includes('Scenario:')) {
		const parsed = parseGherkinFeature(trimmed);
		const lines: string[] = [`Feature: ${parsed.name}`];

		for (const scenario of parsed.scenarios) {
			lines.push(
				'',
				`  Scenario: ${scenario.name}`,
				...stepsToGherkin(scenario.steps),
			);
		}

		return lines.join('\n');
	}

	const blocks = trimmed
		.split(/\n\s*\n/g)
		.map((block) => block.trim())
		.filter((block) => block.length > 0);

	const scenarios = blocks.map((block, index) =>
		parseHumanBlockIntoScenario(block, index),
	);
	const lines: string[] = [
		`Feature: ${featureName.trim() || 'Generated Feature'}`,
	];

	for (const scenario of scenarios) {
		lines.push(
			'',
			`  Scenario: ${scenario.name}`,
			...stepsToGherkin(scenario.steps),
		);
	}

	return lines.join('\n');
}
