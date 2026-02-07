import { defineConfig } from '@playwright/test';

// Use a non-default Vite port to avoid collisions with other running dev servers.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5183';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    // Use dev server for E2E:
    // - avoids local `.env.local` PROD guards (e.g. VITE_GEMINI_API_KEY)
    // - keeps tests aligned with local dev experience
    command: 'npm run dev -- --host 127.0.0.1 --port 5183 --strictPort',
    url: baseURL,
    // Always start the correct server for this repo.
    reuseExistingServer: false,
    timeout: 120000,
  },
  reporter: 'list',
});
