import { defineConfig, devices } from '@playwright/test';

const port = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? '4388', 10);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error(`PLAYWRIGHT_PORT must be a TCP port between 1024 and 65535; received ${process.env.PLAYWRIGHT_PORT ?? '4388'}.`);
}

const baseURL = `http://127.0.0.1:${port}`;
const routeSmoke = /\/route-smoke\.spec\.ts/;
const axeRoutes = /\/axe-routes\.spec\.ts/;
const browserMatrix = /\/browser-matrix\.spec\.ts/;
const interaction = /\/(?:site|atmosphere-future2035)\.spec\.ts/;

const desktop1440 = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };
const mobile390 = { ...devices['iPhone 13'], browserName: 'chromium' as const, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.ts/,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  outputDir: './test-results',
  reporter: process.env.PLAYWRIGHT_REPORTER ?? 'line',
  globalSetup: './tests/qa/global-setup.ts',
  globalTeardown: './tests/qa/global-teardown.ts',
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    // Astro 7 detects agent shells and backgrounds preview unless this variable is truthy.
    command: `ASTRO_PREVIEW_BACKGROUND=0 npm run preview -- --host 127.0.0.1 --port ${port}`,
    port,
    timeout: 30_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium-390',
      testMatch: [routeSmoke, axeRoutes],
      use: { ...mobile390, contextOptions: { reducedMotion: 'reduce' } },
    },
    {
      name: 'chromium-1440',
      testMatch: [routeSmoke, interaction],
      use: desktop1440,
    },
    {
      name: 'chromium-320',
      testMatch: browserMatrix,
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 800 }, contextOptions: { reducedMotion: 'reduce' } },
    },
    {
      name: 'chromium-768',
      testMatch: browserMatrix,
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 900 } },
    },
    {
      name: 'chromium-1024',
      testMatch: browserMatrix,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 900 } },
    },
    {
      name: 'chromium-1280',
      testMatch: browserMatrix,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'chromium-1920',
      testMatch: browserMatrix,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'chromium-200-zoom-proxy',
      testMatch: browserMatrix,
      use: { ...devices['Desktop Chrome'], viewport: { width: 720, height: 900 }, contextOptions: { reducedMotion: 'reduce' } },
    },
    {
      name: 'chromium-400-zoom-proxy',
      testMatch: browserMatrix,
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 900 }, contextOptions: { reducedMotion: 'reduce' } },
    },
    {
      name: 'chromium-forced-colors',
      testMatch: browserMatrix,
      use: { ...desktop1440, contextOptions: { forcedColors: 'active' } },
    },
    {
      name: 'firefox-1440',
      testMatch: browserMatrix,
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'webkit-390',
      testMatch: browserMatrix,
      use: { ...devices['iPhone 13'], browserName: 'webkit', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'android-390',
      testMatch: browserMatrix,
      use: { ...devices['Pixel 5'], browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'chromium-nojs-390',
      testMatch: browserMatrix,
      use: { ...mobile390, javaScriptEnabled: false },
    },
  ],
});
