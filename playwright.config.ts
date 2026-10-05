import { defineConfig, devices } from '@playwright/test';

// E2E against the production build, served like GitHub Pages. Run `npm run build` first.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'nl-NL',
    serviceWorkers: 'allow',
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/kwatro-score/',
    reuseExistingServer: true,
  },
});
