import type {
	GherkinFeature,
	GherkinScenario,
	GherkinStepKeyword,
} from './types';

const STEP_KEYWORDS: ReadonlyArray<GherkinStepKeyword> = [
	'Given',
	'When',
	'Then',
	'And',
	'But',
];

type ParsedLine =
	| { type: 'feature'; name: string }
	| { type: 'scenario'; name: string }
	| { type: 'step'; keyword: GherkinStepKeyword; text: string }
	| { type: 'unsupported' };

function isGherkinStepKeyword(value: string): value is GherkinStepKeyword {
	return STEP_KEYWORDS.includes(value as GherkinStepKeyword);
}

function validateScenarioHasSteps(scenario: GherkinScenario): void {
	if (scenario.steps.length === 0) {
		throw new Error(`Scenario "${scenario.name}" has no steps.`);
	}
}

function pushCurrentScenario(
	currentScenario: GherkinScenario | null,
	scenarios: GherkinScenario[],
): void {
	if (!currentScenario) {
		return;
	}

	validateScenarioHasSteps(currentScenario);
	scenarios.push(currentScenario);
}

function appendStepToScenario(
	currentScenario: GherkinScenario | null,
	step: { keyword: GherkinStepKeyword; text: string },
): void {
	if (!currentScenario) {
		throw new Error('Steps must be inside a scenario.');
	}

	currentScenario.steps.push(step);
}

function parseLine(line: string): ParsedLine {
	if (line.startsWith('Feature:')) {
		return { type: 'feature', name: line.slice('Feature:'.length).trim() };
	}

	if (line.startsWith('Scenario:')) {
		return { type: 'scenario', name: line.slice('Scenario:'.length).trim() };
	}

	const splitAt = line.indexOf(' ');
	let maybeKeyword = line;
	let stepText = '';

	if (splitAt > -1) {
		maybeKeyword = line.slice(0, splitAt);
		stepText = line.slice(splitAt + 1).trim();
	}

	if (!isGherkinStepKeyword(maybeKeyword)) {
		return { type: 'unsupported' };
	}

	if (stepText.length === 0) {
		throw new Error(`Step with keyword "${maybeKeyword}" cannot be empty.`);
	}

	return { type: 'step', keyword: maybeKeyword, text: stepText };
}

function tokenizeGherkinLines(gherkin: string): string[] {
	return gherkin
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function parseGherkinFeature(gherkin: string): GherkinFeature {
	const lines = tokenizeGherkinLines(gherkin);

	let featureName = '';
	const scenarios: GherkinScenario[] = [];
	let currentScenario: GherkinScenario | null = null;

	for (const line of lines) {
		const parsed = parseLine(line);

		if (parsed.type === 'feature') {
			featureName = parsed.name;
			continue;
		}

		if (parsed.type === 'scenario') {
			if (featureName.length === 0) {
				throw new Error('Feature must be declared before any scenario.');
			}

			pushCurrentScenario(currentScenario, scenarios);
			currentScenario = { name: parsed.name, steps: [] };
			continue;
		}

		if (parsed.type === 'step') {
			appendStepToScenario(currentScenario, {
				keyword: parsed.keyword,
				text: parsed.text,
			});
			continue;
		}

		throw new Error(`Unsupported Gherkin line: "${line}"`);
	}

	if (featureName.length === 0) {
		throw new Error('Feature is missing.');
	}

	pushCurrentScenario(currentScenario, scenarios);

	if (scenarios.length === 0) {
		throw new Error('Feature must include at least one scenario.');
	}

	return { name: featureName, scenarios };
}
