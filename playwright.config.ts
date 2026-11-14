import { defineConfig } from '@playwright/test';

// Runs against a production build: `npm run build` first. Install once: npm i -D @playwright/test @axe-core/playwright
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4173', launchOptions: { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] } },
  webServer: { command: 'npx vite preview --port 4173', url: 'http://localhost:4173', reuseExistingServer: true },
});
