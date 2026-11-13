import { defineConfig } from '@playwright/test';

// Long played-through games, one faction a file. They run against a preview that is already up
// (`npx vite preview --port 4173`), so several can run at once; each test gets its own browser database.
const PORT = Number(process.env.SCENARIO_PORT ?? 4173);

export default defineConfig({
  testDir: 'tests/scenarios',
  timeout: 600_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    viewport: { width: 1180, height: 820 },
    hasTouch: true,
    acceptDownloads: true,
    serviceWorkers: 'block',
  },
});
