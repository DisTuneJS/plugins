import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules', '**/dist', '.idea', '.git', '.turbo'],
    coverage: {
      enabled: false,
      reporter: ['text', 'lcov'],
      provider: 'v8',
      include: ['src'],
      exclude: ['**/*.d.ts', '**/index.ts']
    }
  }
});
