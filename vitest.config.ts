import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  // tsconfig keeps `jsx: preserve` for Next, so tell the transformer how to
  // compile the JSX in the component tests.
  oxc: {
    jsx: {
      runtime: 'automatic',
      importSource: 'react'
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/tests/setup.ts'],
    testTimeout: 20000
  }
});
