import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // City runs drive every moving car through the vehicle model (src/sim/drawn.ts): a few seconds each under a full suite.
    testTimeout: 30_000,
    coverage: { include: ['src/sim/**', 'src/city/**', 'content/**'] },
  },
});
