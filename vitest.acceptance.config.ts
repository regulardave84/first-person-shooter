import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.acceptance.test.ts', 'src/**/*.acceptance.generated.test.ts'],
		exclude: [...configDefaults.exclude, '**/.stryker-tmp/**', '**/reports/**'],
	},
});
