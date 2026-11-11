import { defineConfig } from '@playwright/test';

// Port 5199 belongs to the dev server with the saved games; another port gives the tests their own browser database.
// E2E_PORT lets several checkouts run their tests at once, each on its own port.
const PORT = Number(process.env.E2E_PORT ?? 5301);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Needs Google Chrome installed on the machine: no browser is downloaded for the tests.
    channel: 'chrome',
    viewport: { width: 1180, height: 820 },
    hasTouch: true,
    acceptDownloads: true,
    serviceWorkers: 'allow',
  },
  // The offline step needs the service worker, which only the production build has.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
