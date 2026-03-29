import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.js'],
    pool: 'forks', // Use forks instead of threads to prevent worker timeouts with native modules/Firebase
    teardownTimeout: 10000, // Increase teardown timeout
    hookTimeout: 10000,
  },
});
