import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Acceptance: Pre-commit lint auto-fix', () => {
	const preCommitHookPath = resolve(process.cwd(), '.husky/pre-commit');
	const preCommitHook = readFileSync(preCommitHookPath, 'utf8');

	it('Pre-commit auto-fixes lint errors before validation', () => {
		expect(preCommitHook).toContain('npm run lint:fix');
		expect(preCommitHook).toContain('git add --update');
		expect(preCommitHook.trim().startsWith('npm run lint:fix')).toBe(true);
		expect(preCommitHook).toContain('&& npm run lint &&');
	});

	it('Pre-commit still blocks on non-fixable lint failures', () => {
		expect(preCommitHook).toContain('npm run lint');
		expect(preCommitHook).toContain('&&');
	});
});
