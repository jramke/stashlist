import {
    test as base,
    chromium,
    type BrowserContext,
    type Worker,
} from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CHROME =
    process.env.E2E_CHROME ??
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BUILD = resolve(
    import.meta.dirname,
    '../../extension/.output-e2e/chrome-mv3-e2e',
);

export type Extension = {
    context: BrowserContext;
    id: string;
    worker: Worker;
};

async function freePort(): Promise<number> {
    return new Promise((resolvePort, reject) => {
        const server = createServer();
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            server.close(() =>
                address !== null && typeof address === 'object'
                    ? resolvePort(address.port)
                    : reject(new Error('no port')),
            );
        });
    });
}

async function waitForChrome(port: number): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) {
                return;
            }
        } catch {
            // Not up yet.
        }

        await new Promise((r) => setTimeout(r, 100));
    }

    throw new Error('Chrome did not start.');
}

/**
 * A Chrome of its own with the extension loaded, the way a person loads an unpacked one. Chrome 137 and later
 * ignore --load-extension, so the extension goes in through the DevTools protocol (Extensions.loadUnpacked,
 * allowed by --enable-unsafe-extension-debugging) and Playwright connects to the running browser.
 *
 * The build is the end-to-end variant (STASHLIST_E2E=1): it may read any page, because nothing in an automated
 * run can answer the browser's permission prompt.
 */
export const test = base.extend<{ extension: Extension }, { build: void }>({
    // The build happens in the DDEV container; Mutagen has to bring the files to this side before Chrome reads them.
    build: [
        async ({}, use) => {
            execFileSync(
                'ddev',
                [
                    'exec',
                    '-d',
                    '/var/www/html/extension',
                    'STASHLIST_E2E=1 npx wxt build --mode e2e',
                ],
                {
                    stdio: 'pipe',
                },
            );
            execFileSync('ddev', ['mutagen', 'sync'], { stdio: 'pipe' });

            await use();
        },
        { scope: 'worker', auto: true },
    ],

    extension: async ({ build: _build }, use) => {
        if (!existsSync(CHROME)) {
            throw new Error(
                `No Chrome at ${CHROME}. Set E2E_CHROME to the browser to use.`,
            );
        }

        const profile = mkdtempSync(join(tmpdir(), 'stashlist-chrome-'));
        const port = await freePort();
        const chrome = spawn(
            CHROME,
            [
                `--remote-debugging-port=${port}`,
                `--user-data-dir=${profile}`,
                '--enable-unsafe-extension-debugging',
                '--ignore-certificate-errors',
                '--no-first-run',
                '--no-default-browser-check',
                '--window-size=1280,900',
                'about:blank',
            ],
            { stdio: 'ignore' },
        );

        try {
            await waitForChrome(port);

            const browser = await chromium.connectOverCDP(
                `http://127.0.0.1:${port}`,
            );
            const session = await browser.newBrowserCDPSession();
            const { id } = (await session.send('Extensions.loadUnpacked', {
                path: BUILD,
            })) as { id: string };
            const context = browser.contexts()[0];

            if (context === undefined) {
                throw new Error('Chrome has no default context.');
            }

            const worker =
                context
                    .serviceWorkers()
                    .find((candidate) => candidate.url().includes(id)) ??
                (await context.waitForEvent('serviceworker', {
                    predicate: (candidate) => candidate.url().includes(id),
                }));

            // A fresh install opens the options page, as it should. Tests start from a quiet browser.
            const welcome =
                context
                    .pages()
                    .find((page) =>
                        page.url().includes(`${id}/options.html`),
                    ) ??
                (await context
                    .waitForEvent('page', {
                        timeout: 5000,
                        predicate: (page) =>
                            page.url().includes(id) ||
                            page.url() === 'about:blank',
                    })
                    .catch(() => undefined));
            await welcome?.waitForLoadState().catch(() => undefined);
            await welcome?.close().catch(() => undefined);

            await use({ context, id, worker });

            await browser.close().catch(() => undefined);
        } finally {
            const exited = new Promise((done) => chrome.once('exit', done));
            chrome.kill();
            await exited;
            rmSync(profile, {
                recursive: true,
                force: true,
                maxRetries: 10,
                retryDelay: 200,
            });
        }
    },
});

export { expect } from '@playwright/test';
