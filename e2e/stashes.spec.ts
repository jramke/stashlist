import { expect, test, type Page } from '@playwright/test';
import { box, capture, drainQueue, filterBy, menu, register } from './support';

/** The card of a stash in the feed, found by what it shows. */
function card(page: Page, text: string | RegExp) {
    return page.getByRole('link', { name: text });
}

/** From a stash back to the feed through the link at the top. */
async function toFeed(page: Page) {
    await page.getByRole('link', { name: /^Stashes/ }).click();
    await expect(page).toHaveURL(/\/stashes(\?.*)?$/);
}

test('notes and colors are saved, found by search and narrowed by type', async ({
    page,
}) => {
    await register(page);

    await capture(page, 'buy sourdough flour');
    // A color code is saved with Enter alone.
    await box(page).fill('#e63946');
    await expect(
        page.getByRole('button', { name: /Stash color/ }),
    ).toBeVisible();
    await box(page).press('Enter');
    await expect(box(page)).toHaveValue('');

    await expect(card(page, /buy sourdough flour/)).toBeVisible();
    await expect(
        page.getByRole('img', { name: 'color', exact: true }),
    ).toBeVisible();
    drainQueue();

    await box(page).fill('sourdough');
    await expect(page).toHaveURL(/q=sourdough/);
    await expect(card(page, /buy sourdough flour/)).toBeVisible();
    await expect(
        page.getByRole('img', { name: 'color', exact: true }),
    ).toHaveCount(0);

    await box(page).fill('');
    await expect(
        page.getByRole('img', { name: 'color', exact: true }),
    ).toBeVisible();

    // "colors" is a type: Tab turns it into a chip in the box.
    await filterBy(page, 'colors');
    await expect(page).toHaveURL(/type=color/);
    await expect(
        page.getByRole('button', { name: 'Remove Colors' }),
    ).toBeVisible();
    await expect(
        page.getByRole('img', { name: 'color', exact: true }),
    ).toBeVisible();
    await expect(card(page, /buy sourdough flour/)).toHaveCount(0);

    // Backspace at the start takes the last chip off again.
    await box(page).press('Backspace');
    await expect(
        page.getByRole('button', { name: 'Remove Colors' }),
    ).toHaveCount(0);
    await expect(card(page, /buy sourdough flour/)).toBeVisible();
});

test('a color word becomes a chip and goes back to a word with one Backspace', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'buy sourdough flour');

    await box(page).pressSequentially('blue ');
    await expect(
        page.getByRole('button', { name: 'Remove blue' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/color=blue/);
    await expect(box(page)).toHaveValue('');

    await box(page).press('Backspace');
    await expect(page.getByRole('button', { name: 'Remove blue' })).toHaveCount(
        0,
    );
    await expect(box(page)).toHaveValue('blue');
    await expect(page).not.toHaveURL(/color=/);
});

test('a stash can be edited, tagged and found again through its tag', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'buy sourdough flour');
    await capture(page, 'call the plumber');

    await card(page, /buy sourdough flour/).click();
    await expect(page).toHaveURL(/\/stashes\/\d+$/);

    // Fields save themselves; the note says so where the change was made.
    await page.getByLabel('Title', { exact: true }).fill('Flour list');
    await page.getByLabel('Title', { exact: true }).blur();
    await expect(page.getByText('Saved.')).toBeVisible();

    await page.getByLabel('Add a tag').fill('Baking');
    await page.getByLabel('Add a tag').press('Enter');
    await expect(page.getByText('Baking')).toBeVisible();

    await toFeed(page);
    await expect(card(page, /Flour list/)).toBeVisible();

    await filterBy(page, 'Baking');
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
        await page.getByLabel('Add a tag').press('Enter');
        await expect(page.getByText(tag).first()).toBeVisible();
        await toFeed(page);
    }

    await card(page, /knead the dough/).click();

    const more = page.getByText('More like this');
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
    await page.getByRole('button', { name: /^Delete/ }).click();

    // The note with the Undo sits in the box, not in a toast.
    await expect(page).toHaveURL(/\/stashes$/);
    await expect(page.getByText('Deleted.')).toBeVisible();
    await expect(card(page, /buy sourdough flour/)).toHaveCount(0);

    await page.getByRole('button', { name: 'Undo' }).click();

    await expect(page.getByText('Restored.')).toBeVisible();
    await expect(card(page, /buy sourdough flour/)).toBeVisible();
});

test('the feed works from the keyboard: move, open, delete, undo', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'buy sourdough flour');
    await capture(page, 'call the plumber');

    // The box is ready on arrival; the arrow key goes into the stashes.
    await expect(box(page)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-card]:focus')).toHaveCount(1);

    await page.keyboard.press('Backspace');
    await expect(page.getByText('Deleted.')).toBeVisible();
    await expect(page.locator('[data-card]')).toHaveCount(1);

    // Cmd or Ctrl with Z takes it back, outside the box.
    await page.keyboard.press('ControlOrMeta+z');
    await expect(page.getByText('Restored.')).toBeVisible();
    await expect(page.locator('[data-card]')).toHaveCount(2);

    // "/" comes back to the box from anywhere, Escape leaves a stash.
    await page.locator('[data-card]').first().focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/stashes\/\d+$/);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/stashes$/);
    await page.keyboard.press('/');
    await expect(box(page)).toBeFocused();
});

test('collections can be created, filled, renamed and removed', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'buy sourdough flour');
    await capture(page, 'call the plumber');

    await menu(page, 'Collections');
    await page.getByLabel('Name of a new collection').fill('Kitchen');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByLabel('Name of Kitchen')).toBeVisible();

    await page.goto('/stashes');
    await card(page, /buy sourdough flour/).click();
    await page.getByRole('checkbox', { name: 'Kitchen' }).click();
    await expect(page.getByRole('checkbox', { name: 'Kitchen' })).toBeChecked();

    await toFeed(page);
    await filterBy(page, 'Kitchen');
    await expect(card(page, /buy sourdough flour/)).toBeVisible();
    await expect(card(page, /call the plumber/)).toHaveCount(0);

    // What is stashed while a collection is on goes into it.
    await capture(page, 'knead the dough');
    await expect(card(page, /knead the dough/)).toBeVisible();

    await box(page).press('Backspace');
    await filterBy(page, 'unsorted');
    await expect(card(page, /call the plumber/)).toBeVisible();
    await expect(card(page, /buy sourdough flour/)).toHaveCount(0);
    await expect(card(page, /knead the dough/)).toHaveCount(0);

    await menu(page, 'Collections');
    await page.getByLabel('Name of Kitchen').fill('Pantry');
    await page.getByRole('button', { name: 'Rename' }).click();
    await expect(page.getByLabel('Name of Pantry')).toBeVisible();

    // Two presses: the first one only asks.
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: /Delete\?/ }).click();
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

    await filterBy(page, 'failed');
    await expect(page).toHaveURL(/status=failed/);

    await card(page, /127\.0\.0\.1/).click();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('an image pasted into the box is stashed', async ({ page }) => {
    await register(page);

    // A 1x1 PNG, handed to the box the way a paste does.
    await box(page).evaluate((node) => {
        const png = Uint8Array.from(
            atob(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
            ),
            (char) => char.charCodeAt(0),
        );
        const data = new DataTransfer();
        data.items.add(new File([png], 'dot.png', { type: 'image/png' }));
        node.dispatchEvent(
            new ClipboardEvent('paste', {
                clipboardData: data,
                bubbles: true,
                cancelable: true,
            }),
        );
    });

    await expect(page.getByText('Stashed.')).toBeVisible();
    await expect(page.locator('[data-card]')).toHaveCount(1);
});
