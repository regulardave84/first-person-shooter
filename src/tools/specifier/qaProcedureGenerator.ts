import { parseGherkinFeature } from './gherkinParser';
import type { GherkinStep } from './types';

type ManualQaSections = {
	setup: string[];
	actions: string[];
	expectedResults: string[];
};

type Phase = 'Given' | 'When' | 'Then';

function classifyStepsForManualQa(steps: ReadonlyArray<GherkinStep>): ManualQaSections {
	const sections: ManualQaSections = {
		setup: [],
		actions: [],
		expectedResults: [],
	};

	let phase: Phase = 'Given';

	for (const step of steps) {
		if (step.keyword === 'Given') {
			phase = 'Given';
			sections.setup.push(step.text);
			continue;
		}

		if (step.keyword === 'When') {
			phase = 'When';
			sections.actions.push(step.text);
			continue;
		}

		if (step.keyword === 'Then') {
			phase = 'Then';
			sections.expectedResults.push(step.text);
			continue;
		}

		if (phase === 'Given') {
			sections.setup.push(step.text);
			continue;
		}

		if (phase === 'When') {
			sections.actions.push(step.text);
			continue;
		}

		sections.expectedResults.push(step.text);
	}

	return sections;
}

function toBulletList(items: ReadonlyArray<string>, fallback: string): string[] {
	if (items.length === 0) {
		return [`- ${fallback}`];
	}

	return items.map((item) => `- ${item}`);
}

function toNumberedList(items: ReadonlyArray<string>, fallback: string): string[] {
	if (items.length === 0) {
		return [`1. ${fallback}`];
	}

	return items.map((item, index) => `${index + 1}. ${item}`);
}

export function generateManualQaProcedureFromAcceptanceTests(
	gherkin: string,
): string {
	const feature = parseGherkinFeature(gherkin);
	const lines: string[] = [
		`# QA Procedure: ${feature.name}`,
		'',
		'> Scope: Manual UI verification checklist generated from approved acceptance scenarios.',
		'> Gate: Run this procedure only after acceptance scenarios are approved.',
		'',
		'## Pass/Fail Policy',
		'- Mark a manual test as **Pass** only when all expected results are observed.',
		'- Mark a manual test as **Fail** when any expected result is missing or incorrect.',
		'',
	];

	for (const [index, scenario] of feature.scenarios.entries()) {
		const sections = classifyStepsForManualQa(scenario.steps);
		lines.push(`## Manual Test ${index + 1}: ${scenario.name}`);
		lines.push(`- Source scenario: ${scenario.name}`);
		lines.push('');

		lines.push('### Setup');
		lines.push(...toBulletList(sections.setup, 'Open the feature UI in a ready state.'));
		lines.push('');

		lines.push('### UI Actions');
		lines.push(...toNumberedList(sections.actions, 'Perform the user action described by the scenario.'));
		lines.push('');

		lines.push('### Expected Results');
		lines.push(
			...toBulletList(
				sections.expectedResults,
				'Observe the expected user-facing behavior for the scenario.',
			),
		);
		lines.push('');

		lines.push('### Pass/Fail Criteria');
		lines.push('- Pass: every expected result above is confirmed in the UI.');
		lines.push('- Fail: at least one expected result above is not confirmed.');
		lines.push('');
	}

	return lines.join('\n').trimEnd();
}
