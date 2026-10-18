import { BASE_URL, drainQueue } from '../support';
import { expect, test } from './fixture';
import { connect, openArticle, openExtensionPage } from './helpers';

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

    const card = web.getByRole('option', {
        name: /How to raise a sourdough starter/,
    });
    await expect(card).toBeVisible();
    await expect(card.locator('img')).toHaveCount(1);

    // Cards show no tags; the stash page does.
    await card.click();
    await expect(
        web.getByRole('button', { name: 'Remove bread' }),
    ).toBeVisible();
    // Open it, and again if the page was redrawn (it is tagged while it is read) and shut it on the way.
    const text = web.locator('details').filter({ hasText: 'Text of the page' });

    await expect(async () => {
        if (!(await text.evaluate((node: HTMLDetailsElement) => node.open))) {
            await text.locator('summary').click();
        }

        await expect(web.getByText('living culture of wild yeast')).toBeVisible(
            { timeout: 1000 },
        );
    }).toPass({ timeout: 10_000 });
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
        web.getByRole('option', { name: /How to raise a sourdough starter/ }),
    ).toHaveCount(1);
});

test('a revoked token stops the extension and says why', async ({
    extension,
}) => {
    const { web } = await connect(extension);
    const { page: article, tabId } = await openArticle(extension);
    await article.bringToFront();

    await web.goto(`${BASE_URL}/settings/tokens`);
    // Two presses: the first one only asks.
    const revoke = web.getByRole('button', { name: /^Revoke / });
    await revoke.click();
    await revoke.click();
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
