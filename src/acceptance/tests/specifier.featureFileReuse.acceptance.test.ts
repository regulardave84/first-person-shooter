import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Acceptance: Specifier reuses existing feature files for matching feature intents', () => {
	function readSpecifierSkill() {
		return readFileSync(
			path.join(process.cwd(), '.github/skills/specifier/SKILL.md'),
			'utf8',
		);
	}

	function readFeatureWorkflowSkill() {
		return readFileSync(
			path.join(process.cwd(), '.github/skills/feature-workflow/SKILL.md'),
			'utf8',
		);
	}

	it('Detect matching existing feature file before creating a new one', () => {
		const specifierSkill = readSpecifierSkill();

		expect(specifierSkill).toContain(
			'Scan existing feature files under `src/acceptance/features`.',
		);
		expect(specifierSkill).toContain(
			'Existing feature-file reuse checks (before proposing a new file)',
		);
	});

	it('Update matching feature file when intent already exists', () => {
		const specifierSkill = readSpecifierSkill();

		expect(specifierSkill).toContain(
			'If one or more matching feature file(s) exist, propose updates to those existing file(s).',
		);
		expect(specifierSkill).toContain(
			'Do not create a new feature file when a matching existing file already covers the same intent.',
		);
	});

	it('Create a new feature file only when no match exists', () => {
		const specifierSkill = readSpecifierSkill();
		const workflowSkill = readFeatureWorkflowSkill();

		expect(specifierSkill).toContain(
			'Create a new feature file only when no suitable match exists.',
		);
		expect(workflowSkill).toContain(
			'create new feature files only when no suitable match exists.',
		);
	});

	it('Preserve approval gate for updates to existing feature files', () => {
		const specifierSkill = readSpecifierSkill();

		expect(specifierSkill).toContain(
			'When updating an existing feature file, show the proposed delta and require explicit approval before persisting.',
		);
	});
});
