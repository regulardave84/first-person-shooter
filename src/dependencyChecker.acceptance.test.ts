import { describe, expect, it } from 'vitest';
import {
	DEFAULT_DEPENDENCY_POLICY,
	classifyDependencies,
	scanDependenciesInFiles,
	updateDependencyPolicy,
	validateDependenciesAgainstPolicy,
} from './tools/dependencyChecker';

describe('Acceptance: Dependency checker enforces approved dependency policy', () => {
	it('Scan source files to discover used dependencies', () => {
		const result = scanDependenciesInFiles([
			{
				filePath: 'src/runtime.ts',
				content: "import { Scene } from 'three';",
			},
			{
				filePath: 'src/spec.ts',
				content: "import { describe } from 'vitest';",
			},
		]);

		expect(result.discovered).toEqual(['three', 'vitest']);
	});

	it('Compare discovered dependencies against policy lists', () => {
		const classified = classifyDependencies(['three', 'vitest', 'left-pad'], {
			allowed: ['three'],
			disallowed: ['left-pad'],
		});

		expect(classified).toEqual({
			allowed: ['three'],
			disallowed: ['left-pad'],
			unlisted: ['vitest'],
		});
	});

	it('Reject disallowed dependencies', () => {
		const validation = validateDependenciesAgainstPolicy(
			['three', 'left-pad'],
			{
				allowed: ['three'],
				disallowed: ['left-pad'],
			},
		);

		expect(validation.passed).toBe(false);
		expect(validation.violations).toEqual(['left-pad']);
	});

	it('Flag unlisted dependencies for review', () => {
		const validation = validateDependenciesAgainstPolicy(['three', 'new-lib'], {
			allowed: ['three'],
			disallowed: ['left-pad'],
		});

		expect(validation.unlisted).toEqual(['new-lib']);
	});

	it('Protect policy list changes behind explicit permission', () => {
		expect(() =>
			updateDependencyPolicy(
				DEFAULT_DEPENDENCY_POLICY,
				{ disallowed: ['left-pad'] },
				{ explicitPermissionGranted: false },
			),
		).toThrow('require explicit permission');

		const updated = updateDependencyPolicy(
			DEFAULT_DEPENDENCY_POLICY,
			{ disallowed: ['left-pad'] },
			{ explicitPermissionGranted: true },
		);

		expect(updated.disallowed).toEqual(['left-pad']);
	});
});
