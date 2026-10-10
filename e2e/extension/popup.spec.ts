import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BASE_URL, drainQueue, register } from '../support';
import { expect, test, type Extension } from './fixture';

const ARTICLE = readFileSync(
    resolve(import.meta.dirname, '../../tests/fixtures/pages/article.html'),
    'utf8',
);
const PAGE = 'https://bakeclub.example/posts/starter';

/** Opens a page of the extension (the popup is a page of its own in these tests). */
async function openExtensionPage(extension: Extension, path: string) {
    const page = await extension.context.newPage();
    await page.goto(`chrome-extension://${extension.id}/${path}`);

    return page;
}

/** A web page the browser shows but that is served from this test: no network, a fixed article. */
async function openArticle(extension: Extension) {
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
async function connect(extension: Extension) {
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

    return { web, person };
}

test('the popup stashes the page with its text, a tag and a picture', async ({
    extension,
}) => {
    const { web } = await connect(extension);
    const { page: article, tabId } = await openArticle(extension);
    await article.bringToFront();

    const popup = await openExtensionPage(extension, `popup.html?tab=${tabId}`);
    await expect(popup.getByLabel('Title')).toHaveValue(/sourdough starter/);

    await popup.getByLabel('Add a tag').fill('bread');
    await popup.getByLabel('Add a tag').press('Enter');
    await popup.getByRole('button', { name: 'Stash', exact: true }).click();
    await expect(popup.getByText('Stashed.')).toBeVisible();

    drainQueue();
    await web.goto(`${BASE_URL}/stashes`);

    const card = web.getByRole('link', {
        name: /How to raise a sourdough starter/,
    });
    await expect(card).toBeVisible();
    await expect(card).toContainText('bread');
    await expect(card.locator('img')).toHaveCount(1);

    await card.click();
    await web.getByText('Text of the page').click();
    await expect(web.getByText('living culture of wild yeast')).toBeVisible();
});

test('the popup knows a page that is stashed already', async ({
    extension,
}) => {
    const { web } = await connect(extension);
    const { page: article, tabId } = await openArticle(extension);
    await article.bringToFront();

    const first = await openExtensionPage(extension, `popup.html?tab=${tabId}`);
    await first.getByRole('button', { name: 'Stash', exact: true }).click();
    await expect(first.getByText('Stashed.')).toBeVisible();

    const again = await openExtensionPage(extension, `popup.html?tab=${tabId}`);
    await expect(again.getByText(/Already stashed/)).toBeVisible();

    await web.goto(`${BASE_URL}/stashes`);
    await expect(
        web.getByRole('link', { name: /How to raise a sourdough starter/ }),
    ).toHaveCount(1);
});

test('a revoked token stops the extension and says why', async ({
    extension,
}) => {
    const { web } = await connect(extension);
    const { page: article, tabId } = await openArticle(extension);
    await article.bringToFront();

    await web.goto(`${BASE_URL}/settings/tokens`);
    web.once('dialog', (dialog) => dialog.accept());
    await web.getByRole('button', { name: /^Revoke / }).click();
    await expect(web.getByText('No tokens yet.')).toBeVisible();

    const popup = await openExtensionPage(extension, `popup.html?tab=${tabId}`);
    await expect(popup.getByText(/token is not valid/)).toBeVisible();
    await expect(
        popup.getByRole('button', { name: 'Open settings' }),
    ).toBeVisible();
});

test('without a token the popup asks for one', async ({ extension }) => {
    const { tabId } = await openArticle(extension);

    const popup = await openExtensionPage(extension, `popup.html?tab=${tabId}`);

    await expect(popup.getByText(/Add your Stashlist token/)).toBeVisible();
});
