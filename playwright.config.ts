import "dotenv/config";
import { existsSync } from "fs";
import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "3000";
const baseURL = `http://localhost:${PORT}`;

// Some sandboxes pre-install Chromium outside Playwright's own managed browser
// cache and block its downloader; use that build when present, falling back to
// Playwright's normally-installed browser (e.g. in CI) otherwise.
const PREINSTALLED_CHROMIUM = "/opt/pw-browsers/chromium";
const chromiumExecutablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync(PREINSTALLED_CHROMIUM) ? PREINSTALLED_CHROMIUM : undefined);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: chromiumExecutablePath,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
