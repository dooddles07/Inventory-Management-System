import { defineConfig, devices } from "@playwright/test";

const PORT = 3311;
const BASE_URL = `http://localhost:${PORT}`;

/*
  These run against a production build, not the dev server: the routes are prerendered
  static and the failures worth catching are the ones a real visitor would hit.
*/
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    // Every test starts on a fresh browser context, so localStorage is empty and the
    // app reseeds itself. Nothing carries between tests.
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
