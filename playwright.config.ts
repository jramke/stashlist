import { defineConfig, devices } from '@playwright/test';

// Browser flows against a running app. Locally that is the DDEV site, driven by the Chrome installed on this
// machine (no browser download); in CI the app is served by the workflow and Playwright's own Chromium is used.
export default defineConfig({
    testDir: 'e2e',
    // The flows share one server, one database and one queue.
    workers: 1,
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    reporter: process.env.CI ? 'github' : 'list',
    globalTeardown: './e2e/teardown.ts',
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'https://stashlist.ddev.site',
        ignoreHTTPSErrors: true,
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'desktop',
            use: {
                ...devices['Desktop Chrome'],
                ...(process.env.CI ? {} : { channel: 'chrome' }),
            },
        },
    ],
});
