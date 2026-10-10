import type { Page } from '@playwright/test';
import { BASE_URL } from '../support';
import { expect, test } from './fixture';
import { connect, openArticle, openExtensionPage, PAGE } from './helpers';

const PASSAGE = 'living culture of wild yeast';

/** Selects a passage of the article the way a person does: the text is marked in the page. */
async function select(page: Page, passage: string): Promise<void> {
    await page.evaluate((wanted) => {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
        );

        for (
            let node = walker.nextNode();
            node !== null;
            node = walker.nextNode()
        ) {
            const at = (node as Text).data.indexOf(wanted);

            if (at !== -1) {
                const range = document.createRange();
                range.setStart(node, at);
                range.setEnd(node, at + wanted.length);
                getSelection()?.removeAllRanges();
                getSelection()?.addRange(range);

                return;
            }
        }

        throw new Error(`"${wanted}" is not on the page`);
    }, passage);
}

/** How many colors of highlights the page paints right now (the browser's CSS Custom Highlight registry). */
function painted(page: Page): Promise<number> {
    return page.evaluate(() => CSS.highlights.size);
}

test('a highlight made in the popup is saved, listed and painted at once', async ({
    extension,
}) => {
    const { web } = await connect(extension);
    const { page: article, tabId } = await openArticle(extension);
    await article.bringToFront();
    await select(article, PASSAGE);

    const popup = await openExtensionPage(extension, `popup.html?tab=${tabId}`);
    await popup.getByRole('button', { name: 'Highlight selection' }).click();

    await expect(popup.getByText(PASSAGE)).toBeVisible();
    await expect.poll(() => painted(article)).toBe(1);

    // The page was stashed on the way, and the passage is on its page in the web app.
    await web.goto(`${BASE_URL}/stashes`);
    await web.getByRole('link', { name: /Sourdough starters/ }).click();
    await expect(web.getByText(PASSAGE)).toBeVisible();
});

test('asking for a highlight with nothing selected says so', async ({
    extension,
}) => {
    await connect(extension);
    const { page: article, tabId } = await openArticle(extension);
    await article.bringToFront();
    await article.evaluate(() => getSelection()?.removeAllRanges());

    const popup = await openExtensionPage(extension, `popup.html?tab=${tabId}`);
    await popup.getByRole('button', { name: 'Highlight selection' }).click();

    await expect(
        popup.getByText('Select some text on the page first.'),
    ).toBeVisible();
    expect(await painted(article)).toBe(0);
});

test('with "show my highlights on pages" on, a highlight is there again after a reload', async ({
    extension,
}) => {
    await connect(extension);
    const { page: article, tabId } = await openArticle(extension);
    await article.bringToFront();

    const options = await openExtensionPage(extension, 'options.html');
    await options.getByLabel(/Show my highlights on pages/).click();
    await expect(
        options.getByLabel(/Show my highlights on pages/),
    ).toBeChecked();
    await options.close();

    await select(article, PASSAGE);
    const popup = await openExtensionPage(extension, `popup.html?tab=${tabId}`);
    await popup.getByRole('button', { name: 'Highlight selection' }).click();
    await expect(popup.getByText(PASSAGE)).toBeVisible();

    await article.reload();

    await expect.poll(() => painted(article)).toBe(1);
});

test('removing a highlight in the popup takes the paint off the page and deletes it', async ({
    extension,
}) => {
    const { web } = await connect(extension);
    const { page: article, tabId } = await openArticle(extension);
    await article.bringToFront();
    await select(article, PASSAGE);

    const popup = await openExtensionPage(extension, `popup.html?tab=${tabId}`);
    await popup.getByRole('button', { name: 'Highlight selection' }).click();
    await expect.poll(() => painted(article)).toBe(1);

    await popup.getByRole('button', { name: 'Remove highlight' }).click();

    await expect(popup.getByText(PASSAGE)).toHaveCount(0);
    await expect.poll(() => painted(article)).toBe(0);

    await web.goto(`${BASE_URL}/stashes`);
    await web.getByRole('link', { name: /Sourdough starters/ }).click();
    await expect(web.getByText(PASSAGE)).toHaveCount(0);
});

test('a highlight made somewhere else shows up after a sync', async ({
    extension,
}) => {
    const { web, token } = await connect(extension);
    const { page: article } = await openArticle(extension);

    const options = await openExtensionPage(extension, 'options.html');
    await options.getByLabel(/Show my highlights on pages/).click();
    await expect(
        options.getByLabel(/Show my highlights on pages/),
    ).toBeChecked();

    // Another device marks the passage: the extension here knows nothing of it yet.
    const status = await web.evaluate(
        async ({ address, secret, page, passage }) =>
            (
                await fetch(`${address}/api/v1/highlights`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${secret}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: page,
                        title: 'How to raise a sourdough starter',
                        text: passage,
                        prefix: '',
                        suffix: '',
                    }),
                })
            ).status,
        { address: BASE_URL, secret: token, page: PAGE, passage: PASSAGE },
    );
    expect(status).toBe(201);

    // Saving the settings syncs; the alarm does the same every half hour.
    await options.getByRole('button', { name: 'Save and test' }).click();
    await expect(options.getByText(/Connected as/)).toBeVisible();

    await expect
        .poll(async () => {
            await article.reload();

            return painted(article);
        })
        .toBe(1);
});
