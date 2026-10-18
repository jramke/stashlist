import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { BASE_URL, register } from '../support';
import { expect, type Extension } from './fixture';

const ARTICLE = readFileSync(
    resolve(import.meta.dirname, '../../tests/fixtures/pages/article.html'),
    'utf8',
);
export const PAGE = 'https://bakeclub.example/posts/starter';

/** Opens a page of the extension (the popup is a page of its own in these tests). */
export async function openExtensionPage(extension: Extension, path: string) {
    const page = await extension.context.newPage();
    await page.goto(`chrome-extension://${extension.id}/${path}`);

    return page;
}

/** A web page the browser shows but that is served from this test: no network, a fixed article. */
export async function openArticle(extension: Extension) {
    await extension.context.route('https://bakeclub.example/**', (route) =>
        route.fulfill({ contentType: 'text/html', body: ARTICLE }),
    );

    const page = await extension.context.newPage();
    await page.goto(PAGE);

    // Runs in the extension's service worker, where the `chrome` API lives.
    const tabId = await extension.worker.evaluate(async () => {
        const { chrome } = globalThis as unknown as {
            chrome: {
                tabs: {
                    query: (filter: {
                        url: string;
                    }) => Promise<{ id?: number }[]>;
                };
            };
        };
        const [tab] = await chrome.tabs.query({
            url: 'https://bakeclub.example/*',
        });

        return tab?.id ?? -1;
    });

    return { page, tabId };
}

/** A new person in the web app with a token, connected on the extension's options page. */
export async function connect(extension: Extension) {
    const web = await extension.context.newPage();
    const person = await register(web);

    await web.goto(`${BASE_URL}/settings/tokens`);
    await web.getByLabel('Name of the app').fill('Chrome with the extension');
    await web.getByRole('button', { name: 'Create token' }).click();
    const token = await web.getByLabel('Your new token').inputValue();

    const options = await openExtensionPage(extension, 'options.html');
    await options.getByLabel('Address of your Stashlist').fill(BASE_URL);
    await options.getByLabel('Token').fill(token);
    await options.getByRole('button', { name: 'Save and test' }).click();
    await expect(
        options.getByText(`Connected as ${person.name}`),
    ).toBeVisible();
    await options.close();

    return { web, person, token };
}

/** The colors of the pictures the flows serve: the app files them under these names. */
const COLORS = {
    red: [255, 0, 0],
    green: [0, 160, 0],
    blue: [0, 0, 255],
} as const;

export type Color = keyof typeof COLORS;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let crc = n;

    for (let bit = 0; bit < 8; bit++) {
        crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    return crc >>> 0;
});

function crc32(bytes: Buffer): number {
    let crc = 0xffffffff;

    for (const byte of bytes) {
        crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    const crc = Buffer.alloc(4);

    length.writeUInt32BE(data.length);
    crc.writeUInt32BE(crc32(body));

    return Buffer.concat([length, body, crc]);
}

/** A PNG of one color. The server reads it like any picture, and its color is what tells two pictures apart. */
export function solidPng(color: Color, width = 640, height = 480): Buffer {
    const [red, green, blue] = COLORS[color];
    const header = Buffer.alloc(13);
    const row = Buffer.alloc(1 + width * 3);

    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8; // bits per channel
    header[9] = 2; // RGB

    for (let x = 0; x < width; x++) {
        row[1 + x * 3] = red;
        row[2 + x * 3] = green;
        row[3 + x * 3] = blue;
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', header),
        chunk('IDAT', deflateSync(Buffer.concat(Array(height).fill(row)))),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

/**
 * A site served from this test, no network: pages by path on `https://<host>`, and pictures by path on
 * `https://cdn.<host>` (answered with a CORS header, as a CDN does, so the page may read them).
 */
export async function serveSite(
    extension: Extension,
    host: string,
    site: { pages: Record<string, string>; pictures: Record<string, Color> },
): Promise<void> {
    await extension.context.route(`https://${host}/**`, (route) => {
        const html = site.pages[new URL(route.request().url()).pathname];

        return html === undefined
            ? route.fulfill({ status: 404, body: 'not found' })
            : route.fulfill({ contentType: 'text/html', body: html });
    });
    await extension.context.route(`https://cdn.${host}/**`, (route) => {
        const color = site.pictures[new URL(route.request().url()).pathname];

        return color === undefined
            ? route.fulfill({ status: 404, body: 'not found' })
            : route.fulfill({
                  contentType: 'image/png',
                  headers: { 'access-control-allow-origin': '*' },
                  body: solidPng(color),
              });
    });
}

/** Opens a page the context serves and finds the id of its tab, which the extension's own API speaks in. */
export async function openPage(extension: Extension, url: string) {
    const page = await extension.context.newPage();
    await page.goto(url);
    await page.bringToFront();

    const tabId = await extension.worker.evaluate(async (address) => {
        const { chrome } = globalThis as unknown as {
            chrome: {
                tabs: {
                    query: (filter: {
                        url: string;
                    }) => Promise<{ id?: number }[]>;
                };
            };
        };
        const [tab] = await chrome.tabs.query({ url: address });

        return tab?.id ?? -1;
    }, url);

    return { page, tabId };
}

/**
 * What the person does with the browser's own context menu, which no test can click: the same handler, called in
 * the extension's service worker (the end-to-end build exposes it). Returns the tooltip of the toolbar icon
 * afterwards, which is how the extension says what it did.
 */
export async function useMenu(
    extension: Extension,
    tabId: number,
    click: { menuItemId: string; srcUrl?: string; frameId?: number },
): Promise<string> {
    return extension.worker.evaluate(
        async ({ id, info }) => {
            const { chrome, stashlistMenu } = globalThis as unknown as {
                chrome: {
                    tabs: { get: (id: number) => Promise<unknown> };
                    action: {
                        getTitle: (filter: {
                            tabId: number;
                        }) => Promise<string>;
                    };
                };
                stashlistMenu: (info: unknown, tab: unknown) => Promise<void>;
            };

            await stashlistMenu(
                { frameId: 0, ...info },
                await chrome.tabs.get(id),
            );

            return chrome.action.getTitle({ tabId: id });
        },
        { id: tabId, info: click },
    );
}
