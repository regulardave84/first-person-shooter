import { parseGherkinFeature } from './gherkinParser';

function toIdentifier(value: string): string {
	const cleaned = value
		.replace(/[^A-Za-z0-9 ]+/g, ' ')
		.trim()
		.replace(/\s+/g, '_');

	if (cleaned.length === 0) {
		return 'unnamed_step';
	}

	if (/^[0-9]/.test(cleaned)) {
		return `step_${cleaned}`;
	}

	return cleaned;
}

export function generateUnitTestsFromAcceptanceTests(gherkin: string): string {
	const feature = parseGherkinFeature(gherkin);
	const stepTexts: string[] = [];

	for (const scenario of feature.scenarios) {
		for (const step of scenario.steps) {
			const fullText = `${step.keyword} ${step.text}`;
			if (!stepTexts.includes(fullText)) {
				stepTexts.push(fullText);
			}
		}
	}

	const stepDefinitionEntries = stepTexts
		.map(
			(stepText) =>
				`  ${JSON.stringify(stepText)}: async (context) => {\n    void context;\n  },`,
		)
		.join('\n');

	const scenarioTests = feature.scenarios
		.map((scenario) => {
			const varName = `${toIdentifier(scenario.name)}_steps`;
			const steps = scenario.steps
				.map(
					(step) =>
						`      { keyword: ${JSON.stringify(step.keyword)}, text: ${JSON.stringify(step.text)} },`,
				)
				.join('\n');

			return [
				`  const ${varName} = [`,
				steps,
				'  ] as const;',
				'',
				`  it(${JSON.stringify(scenario.name)}, async () => {`,
				`    await runScenario(${varName}, stepDefinitions, {});`,
				'  });',
			].join('\n');
		})
		.join('\n\n');

	return [
		"import { describe, it } from 'vitest';",
		"import { runScenario, type StepDefinitions } from '../../../specifier';",
		'',
		'const stepDefinitions: StepDefinitions = {',
		stepDefinitionEntries,
		'};',
		'',
		`describe(${JSON.stringify(`Acceptance: ${feature.name}`)}, () => {`,
		scenarioTests,
		'});',
		'',
	].join('\n');
}
