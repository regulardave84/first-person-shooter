import { describe, expect, it } from 'vitest';
import {
	DEFAULT_DEPENDENCY_POLICY,
	classifyDependencies,
	extractDependenciesFromSource,
	normalizeDependencyName,
	scanDependenciesInFiles,
	updateDependencyPolicy,
	validateDependenciesAgainstPolicy,
} from './tools/dependencyChecker';

describe('dependencyChecker core', () => {
	it('extracts external dependencies from source text', () => {
		const discovered = extractDependenciesFromSource(`
      import { describe } from 'vitest';
      import { Scene } from 'three';
      import localThing from './localThing';
      export { helper } from '@scope/pkg/internal/path';
      const x = require('lodash/map');
      const y = import('chalk/source/index.js');
    `);

		expect(discovered).toEqual([
			'@scope/pkg',
			'chalk',
			'lodash',
			'three',
			'vitest',
		]);
	});

	it('normalizes dependency names to package roots', () => {
		expect(normalizeDependencyName('@scope/name/subpath')).toBe('@scope/name');
		expect(normalizeDependencyName('@scope')).toBe('@scope');
		expect(normalizeDependencyName('library/submodule')).toBe('library');
		expect(normalizeDependencyName('./relative/module')).toBeNull();
		expect(normalizeDependencyName('/absolute/module')).toBeNull();
		expect(normalizeDependencyName('https://example.com/mod.js')).toBeNull();
		expect(normalizeDependencyName('node:fs')).toBeNull();
	});

	it('ignores empty module specifiers when extracting dependencies', () => {
		const discovered = extractDependenciesFromSource(`
      import "";
      const lazy = import('three');
    `);

		expect(discovered).toEqual(['three']);
	});

	it('scans multiple files and groups dependencies by file', () => {
		const scan = scanDependenciesInFiles([
			{
				filePath: 'src/a.ts',
				content: "import { Scene } from 'three';",
			},
			{
				filePath: 'src/b.ts',
				content: "import { describe } from 'vitest'; import x from './x';",
			},
		]);

		expect(scan.discovered).toEqual(['three', 'vitest']);
		expect(scan.byFile).toEqual([
			{ filePath: 'src/a.ts', dependencies: ['three'] },
			{ filePath: 'src/b.ts', dependencies: ['vitest'] },
		]);
	});

	it('classifies dependencies as allowed, disallowed, or unlisted', () => {
		const classification = classifyDependencies(
			['three', 'left-pad', 'vitest'],
			{
				allowed: ['three', 'vitest'],
				disallowed: ['left-pad'],
			},
		);

		expect(classification).toEqual({
			allowed: ['three', 'vitest'],
			disallowed: ['left-pad'],
			unlisted: [],
		});
	});

	it('fails validation when disallowed dependencies are discovered', () => {
		const validation = validateDependenciesAgainstPolicy(
			['three', 'bad-package'],
			{
				allowed: ['three'],
				disallowed: ['bad-package'],
			},
		);

		expect(validation.passed).toBe(false);
		expect(validation.violations).toEqual(['bad-package']);
	});

	it('flags dependencies that are unlisted in policy', () => {
		const validation = validateDependenciesAgainstPolicy(
			['three', 'new-package'],
			{
				allowed: ['three'],
				disallowed: ['forbidden-package'],
			},
		);

		expect(validation.passed).toBe(true);
		expect(validation.unlisted).toEqual(['new-package']);
	});

	it('blocks policy updates unless explicit permission is granted', () => {
		expect(() =>
			updateDependencyPolicy(
				DEFAULT_DEPENDENCY_POLICY,
				{ allowed: ['three', 'vitest', 'eslint'] },
				{ explicitPermissionGranted: false },
			),
		).toThrow('require explicit permission');

		const updated = updateDependencyPolicy(
			DEFAULT_DEPENDENCY_POLICY,
			{ disallowed: ['left-pad'] },
			{ explicitPermissionGranted: true },
		);

		expect(updated.disallowed).toEqual(['left-pad']);
		expect(updated.requireExplicitPermissionToModify).toBe(true);
	});

	it('allows updates without explicit permission when policy lock is disabled', () => {
		const updated = updateDependencyPolicy(
			{
				allowed: ['three'],
				disallowed: [],
				requireExplicitPermissionToModify: false,
			},
			{ allowed: ['three', 'vitest'] },
			{ explicitPermissionGranted: false },
		);

		expect(updated.allowed).toEqual(['three', 'vitest']);
		expect(updated.requireExplicitPermissionToModify).toBe(false);
	});
});
