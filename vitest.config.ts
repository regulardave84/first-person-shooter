import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: true,
    maxWorkers: '50%',
    include: ['src/**/*.test.ts'],
    exclude: [
      ...configDefaults.exclude,
      '**/.stryker-tmp/**',
      '**/reports/**',
      'src/**/*.acceptance.test.ts',
      'src/**/*.acceptance.generated.test.ts',
    ],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/main.ts',
        'src/app/**',
        'src/gameLogic.ts',
        'src/fpsRuntime.ts',
        'src/specifier.ts',
        'src/tools/specifier/types.ts',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
