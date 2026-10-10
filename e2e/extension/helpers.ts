import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
