import { expect, test, type Page } from '@playwright/test';
import { capture, drainQueue, register } from './support';

/** The card of a stash in the feed, found by what it shows. */
function card(page: Page, text: string | RegExp) {
    return page.getByRole('link', { name: text });
}

test('notes and colors are saved, found by search and narrowed by type', async ({
    page,
}) => {
    await register(page);

    await capture(page, 'buy sourdough flour');
    await capture(page, '#e63946');

    await expect(card(page, /buy sourdough flour/)).toBeVisible();
    await expect(
        page.getByRole('img', { name: 'color', exact: true }),
    ).toBeVisible();
    drainQueue();

    await page.getByLabel('Search your stashes').fill('sourdough');
    await expect(page).toHaveURL(/q=sourdough/);
    await expect(card(page, /buy sourdough flour/)).toBeVisible();
    await expect(
        page.getByRole('img', { name: 'color', exact: true }),
    ).toHaveCount(0);

    await page.getByLabel('Search your stashes').fill('');
    await expect(
        page.getByRole('img', { name: 'color', exact: true }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Colors' }).click();
    await expect(
        page.getByRole('img', { name: 'color', exact: true }),
    ).toBeVisible();
    await expect(card(page, /buy sourdough flour/)).toHaveCount(0);
});

test('a stash can be edited, tagged and found again through its tag', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'buy sourdough flour');
    await capture(page, 'call the plumber');

    await card(page, /buy sourdough flour/).click();
    await expect(page).toHaveURL(/\/stashes\/\d+$/);

    await page.getByLabel('Title', { exact: true }).fill('Flour list');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    await page.getByLabel('Add a tag').fill('Baking');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('Baking')).toBeVisible();

    await page.getByRole('link', { name: 'All stashes' }).click();
    await expect(card(page, /Flour list/)).toBeVisible();

    await page.getByRole('link', { name: 'Baking', exact: true }).click();
    await expect(page).toHaveURL(/tag/);
    await expect(card(page, /Flour list/)).toBeVisible();
    await expect(card(page, /call the plumber/)).toHaveCount(0);
});

test('a stash shows the others that share its tags under "More like this"', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'knead the dough for ten minutes');
    await capture(page, 'feed the starter every morning');
    await capture(page, 'call the plumber');

    for (const [text, tag] of [
        [/knead the dough/, 'Baking'],
        [/feed the starter/, 'Baking'],
    ] as const) {
        await card(page, text).click();
        await page.getByLabel('Add a tag').fill(tag);
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await expect(page.getByText(tag).first()).toBeVisible();
        await page.getByRole('link', { name: 'All stashes' }).click();
    }

    await card(page, /knead the dough/).click();

    const more = page.getByRole('heading', { name: 'More like this' });
    await expect(more).toBeVisible();
    await expect(
        page.getByRole('link', { name: /feed the starter/ }),
    ).toBeVisible();
    await expect(
        page.getByRole('link', { name: /call the plumber/ }),
    ).toHaveCount(0);
});

test('a deleted stash can be brought back during the undo window', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'buy sourdough flour');

    await card(page, /buy sourdough flour/).click();
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page).toHaveURL(/\/stashes$/);
    await expect(page.getByText('Deleted.')).toBeVisible();
    await expect(card(page, /buy sourdough flour/)).toHaveCount(0);

    await page.getByRole('button', { name: 'Undo' }).click();

    await expect(page.getByText('Restored.')).toBeVisible();
    await expect(card(page, /buy sourdough flour/)).toBeVisible();
});

test('collections can be created, filled, renamed and removed', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'buy sourdough flour');
    await capture(page, 'call the plumber');

    await page.getByRole('link', { name: 'Collections' }).first().click();
    await page.getByLabel('Name of a new collection').fill('Kitchen');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByLabel('Name of Kitchen')).toBeVisible();

    await page.getByRole('link', { name: 'All stashes' }).click();
    await card(page, /buy sourdough flour/).click();
    await page.getByRole('checkbox', { name: 'Kitchen' }).click();
    await expect(page.getByRole('checkbox', { name: 'Kitchen' })).toBeChecked();

    await page.getByRole('link', { name: 'All stashes' }).click();
    await page
        .getByRole('navigation', { name: 'Collections' })
        .getByRole('link', { name: /Kitchen/ })
        .click();
    await expect(card(page, /buy sourdough flour/)).toBeVisible();
    await expect(card(page, /call the plumber/)).toHaveCount(0);

    await page.getByRole('link', { name: 'Unsorted' }).click();
    await expect(card(page, /call the plumber/)).toBeVisible();
    await expect(card(page, /buy sourdough flour/)).toHaveCount(0);

    await page
        .getByRole('link', { name: 'Collections', exact: true })
        .first()
        .click();
    await page.getByLabel('Name of Kitchen').fill('Pantry');
    await page.getByRole('button', { name: 'Rename' }).click();
    await expect(page.getByLabel('Name of Pantry')).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByLabel('Name of Pantry')).toHaveCount(0);
});

test('a link to a private address fails safely, shows it on the card and can be tried again', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'http://127.0.0.1/admin');

    // With a real queue the card shows "Fetching" until a worker has been there; the CI queue is synchronous.
    await expect(card(page, /127\.0\.0\.1/)).toContainText(/Fetching|Failed/);
    drainQueue();

    // The feed polls while a card is still being filled in; the card changes in place.
    await expect(card(page, /127\.0\.0\.1/)).toContainText('Failed', {
        timeout: 10_000,
    });
    await expect(card(page, /127\.0\.0\.1/)).toHaveCount(1);

    await page.getByRole('link', { name: 'Failed', exact: true }).click();
    await expect(page).toHaveURL(/status=failed/);

    await card(page, /127\.0\.0\.1/).click();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
