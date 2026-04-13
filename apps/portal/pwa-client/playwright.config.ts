import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_FIREBASE_API_KEY: 'dummy-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'dummy-auth-domain',
      VITE_FIREBASE_PROJECT_ID: 'dummy-project-id',
      VITE_FIREBASE_STORAGE_BUCKET: 'dummy-storage-bucket',
      VITE_FIREBASE_MESSAGING_SENDER_ID: 'dummy-sender-id',
      VITE_FIREBASE_APP_ID: 'dummy-app-id',
    },
  },
});
