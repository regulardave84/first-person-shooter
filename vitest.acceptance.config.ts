import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: [
			'src/acceptance/tests/**/*.acceptance.test.ts',
			'src/acceptance/tests/generated/**/*.acceptance.generated.test.ts',
		],
		exclude: [...configDefaults.exclude, '**/.stryker-tmp/**', '**/reports/**'],
	},
});
