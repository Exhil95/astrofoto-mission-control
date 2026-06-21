import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.playwright.ts",
  timeout: 30_000,
  expect: {
    timeout: 8_000
  },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5174",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
