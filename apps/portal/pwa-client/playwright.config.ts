import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: require.resolve('./e2e/global-setup'),
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
      VITE_USE_FIREBASE_EMULATOR: 'true',
      VITE_FIREBASE_API_KEY: 'finlogia-demo',
      VITE_FIREBASE_AUTH_DOMAIN: 'finlogia-demo.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'finlogia-demo',
      VITE_FIREBASE_STORAGE_BUCKET: 'finlogia-demo.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: 'dummy-sender-id',
      VITE_FIREBASE_APP_ID: 'dummy-app-id',
    },
  },
});
