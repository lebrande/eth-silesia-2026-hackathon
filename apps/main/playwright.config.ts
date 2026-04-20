import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    headless: false,
    // Standard 1366x768 web viewport — matches what most users see.
    // deviceScaleFactor: 2 renders at Retina (2732x1536 framebuffer) so the
    // captured video is crisp; the MP4 is downscaled to 1366x768 for delivery.
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 2,
    video: { mode: "on", size: { width: 1366, height: 768 } },
    trace: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 768 },
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    cwd: ".",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      SMS_MOCK: "true",
      MOCK_AUTH_CODE: "000000",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});
