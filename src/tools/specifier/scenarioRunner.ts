import type { GherkinStep, StepContext, StepDefinitions } from './types';

export async function runScenario(
	steps: ReadonlyArray<GherkinStep>,
	stepDefinitions: StepDefinitions,
	context: StepContext = {},
): Promise<void> {
	for (const step of steps) {
		const fullText = `${step.keyword} ${step.text}`;
		const handler = stepDefinitions[fullText] ?? stepDefinitions[step.text];
		if (!handler) {
			throw new Error(`Missing step definition for: ${fullText}`);
		}
		await handler(context);
	}
}
