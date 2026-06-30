import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'zh-CN',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  reporter: [['list']],
});
