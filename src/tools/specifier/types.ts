export type GherkinStepKeyword = 'Given' | 'When' | 'Then' | 'And' | 'But';

export type GherkinStep = {
	keyword: GherkinStepKeyword;
	text: string;
};

export type GherkinScenario = {
	name: string;
	steps: GherkinStep[];
};

export type GherkinFeature = {
	name: string;
	scenarios: GherkinScenario[];
};

export type StepContext = Record<string, unknown>;
export type StepHandler = (context: StepContext) => void | Promise<void>;
export type StepDefinitions = Record<string, StepHandler>;
