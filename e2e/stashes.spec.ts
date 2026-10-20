import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { box, capture, drainQueue, filterBy, menu, register } from './support';

/** The card of a stash in the feed, found by what it says: what it is, and its title or its text. */
function card(page: Page, text: string | RegExp) {
    return page.getByRole('option', { name: text });
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
    await expect(page.locator('[data-card][data-type="color"]')).toBeVisible();
    drainQueue();

    await box(page).fill('sourdough');
    await expect(page).toHaveURL(/q=sourdough/);
    await expect(card(page, /buy sourdough flour/)).toBeVisible();
    await expect(page.locator('[data-card][data-type="color"]')).toHaveCount(0);

    await box(page).fill('');
    await expect(page.locator('[data-card][data-type="color"]')).toBeVisible();

    // "colors" is a type: Tab turns it into a chip in the box.
    await filterBy(page, 'colors');
    await expect(page).toHaveURL(/type=color/);
    await expect(
        page.getByRole('button', { name: 'Remove Colors' }),
    ).toBeVisible();
    await expect(page.locator('[data-card][data-type="color"]')).toBeVisible();
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

test('the box offers a menu to a click, takes a row with the arrows, and peels back one layer per Escape', async ({
    page,
}) => {
    await register(page);

    // A click in the empty box opens the menu; the arrows choose a row and Enter turns it into a chip.
    await box(page).click();
    await expect(
        page.getByRole('option', { name: /Stash an image from your device/ }),
    ).toBeVisible();
    await box(page).press('ArrowDown');
    await box(page).press('ArrowDown');
    await expect(
        page.getByRole('option', { name: /Unsorted/ }),
    ).toHaveAttribute('aria-selected', 'true');
    await box(page).press('Enter');
    await expect(
        page.getByRole('button', { name: 'Remove Unsorted' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/collection=none/);
    await expect(page.getByRole('option')).toHaveCount(0);

    // Typing offers what the word could become. Escape closes the list, then clears the text, then lets go.
    await box(page).fill('col');
    await expect(page.getByRole('option', { name: /Colors/ })).toBeVisible();
    await box(page).press('Escape');
    await expect(page.getByRole('option')).toHaveCount(0);
    await expect(box(page)).toHaveValue('col');
    await box(page).press('Escape');
    await expect(box(page)).toHaveValue('');
    await expect(page).not.toHaveURL(/q=/);
    await box(page).press('Escape');
    await expect(box(page)).not.toBeFocused();
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
    // The tag, whatever its case (a model that tagged the stash "baking" first owns the spelling), and nothing
    // longer: with smart features on, the summary may mention baking too.
    await expect(page.getByText(/^baking$/i).first()).toBeVisible();

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
        await expect(
            page.getByText(tag, { exact: true }).first(),
        ).toBeVisible();
        await toFeed(page);
    }

    await card(page, /knead the dough/).click();

    const more = page.getByText('More like this');
    await expect(more).toBeVisible();
    await expect(
        page.getByRole('link', { name: /feed the starter/ }),
    ).toBeVisible();
    // Not asserted: with smart features on, stashes with a similar meaning are listed too.
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

    // The box is ready on arrival; the arrow key goes into the stashes, where the first card is highlighted.
    await expect(box(page)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-card][data-highlighted]')).toHaveCount(1);

    await page.keyboard.press('Control+Backspace');
    await expect(page.getByText('Deleted.')).toBeVisible();
    await expect(page.locator('[data-card]')).toHaveCount(1);

    // Ctrl with Z takes it back, outside the box. (The hotkey library reads the platform from the browser, and
    // Playwright's Desktop Chrome says Windows, so mod is Ctrl here whatever the machine.)
    await page.keyboard.press('Control+z');
    await expect(page.getByText('Restored.')).toBeVisible();
    await expect(page.locator('[data-card]')).toHaveCount(2);

    // Enter opens the highlighted card, Escape comes back, and "/" is the box again.
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/stashes\/\d+$/);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/stashes$/);
    await page.keyboard.press('/');
    await expect(box(page)).toBeFocused();
});

test('the grid is one list: arrows go through rows and columns, Home and End jump, Up leaves it', async ({
    page,
}) => {
    await register(page);

    for (const text of [
        'one',
        'two',
        'three',
        'four',
        'five',
        'six',
        'seven',
    ]) {
        await capture(page, text);
    }

    const columns = await page.evaluate(
        () =>
            getComputedStyle(
                document.querySelector('[data-stash-grid]')!,
            ).gridTemplateColumns.split(' ').length,
    );
    expect(columns).toBeGreaterThan(1);

    const highlighted = page.locator('[data-card][data-highlighted]');

    // Tab from the box is one stop for the whole grid; the newest stash, the first card, is highlighted.
    await page.keyboard.press('Tab');
    await expect(highlighted).toHaveAttribute('aria-label', /seven/);

    await page.keyboard.press('ArrowRight');
    await expect(highlighted).toHaveAttribute('aria-label', /six/);

    await page.keyboard.press('End');
    await expect(highlighted).toHaveAttribute('aria-label', /one/);

    await page.keyboard.press('Home');
    await expect(highlighted).toHaveAttribute('aria-label', /seven/);

    // A row down is `columns` cards on, when there is one.
    await page.keyboard.press('ArrowDown');

    if (columns < 7) {
        await expect(highlighted).not.toHaveAttribute('aria-label', /seven/);
    }

    // Home, then up from the first row: back to the box.
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowUp');
    await expect(box(page)).toBeFocused();

    // Down again and Escape: also back to the box.
    await page.keyboard.press('ArrowDown');
    await expect(highlighted).toHaveCount(1);
    await page.keyboard.press('Escape');
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

test('a chip is gone the moment it is taken off, and stays gone when a word is typed before the server answers', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'buy sourdough flour');
    // The word typed below is a search: the note has to be in the index by then, whatever else is running.
    drainQueue();
    await filterBy(page, 'notes');
    await expect(
        page.getByRole('button', { name: 'Remove Notes' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/type=note/);

    // A slow server: the next request starts before the last one is back.
    await page.route(/\/stashes(\?|$)/, async (route) => {
        if (route.request().headers()['x-inertia'] !== undefined) {
            await new Promise((resolve) => setTimeout(resolve, 700));
        }

        await route.continue();
    });

    await box(page).press('Backspace');
    // The chips follow the box at once; the server is only asked.
    await expect(
        page.getByRole('button', { name: 'Remove Notes' }),
    ).toHaveCount(0, { timeout: 400 });

    await box(page).fill('flour');
    await expect(page).toHaveURL(/q=flour/);
    await expect(page).not.toHaveURL(/type=/);
    await expect(
        page.getByRole('button', { name: 'Remove Notes' }),
    ).toHaveCount(0);
    await expect(card(page, /buy sourdough flour/)).toBeVisible();
});

test('pressing a card while the focus is elsewhere does not scroll the page to the top of the grid', async ({
    page,
}) => {
    // One narrow column, so a few cards make a long page.
    await page.setViewportSize({ width: 360, height: 640 });
    await register(page);

    for (const text of [
        'one',
        'two',
        'three',
        'four',
        'five',
        'six',
        'seven',
    ]) {
        await capture(page, text);
    }

    // Down at the end of the feed, where the grid does not cover the screen: that is where a focus scrolls it.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(box(page)).toBeFocused();

    const before = await page.evaluate(() => window.scrollY);

    expect(before).toBeGreaterThan(900);

    // The press, without the release: a release on the card would open it.
    await page.mouse.move(180, 400);
    await page.mouse.down();
    await expect(page.locator('[data-stash-grid]')).toBeFocused();
    await page.waitForTimeout(250);

    expect(await page.evaluate(() => window.scrollY)).toBe(before);

    await page.mouse.move(180, 20);
    await page.mouse.up();
});

test('the box and the server agree on what is a color: written out, and a color name is a word', async ({
    page,
}) => {
    // The samples the server's classifier is tested with.
    const samples = JSON.parse(
        readFileSync('tests/fixtures/input-colors.json', 'utf8'),
    ) as { colors: string[]; text: string[] };

    await register(page);

    for (const color of samples.colors) {
        await box(page).fill(color);
        await expect(
            page.getByRole('button', { name: /Stash color/ }),
            color,
        ).toBeVisible();
    }

    for (const text of samples.text) {
        await box(page).fill(text);
        await expect(
            page.getByRole('button', { name: /Stash note/ }),
            text,
        ).toBeVisible();
    }
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

test('a big picture comes in two sizes, and the card lets the browser take the smaller', async ({
    page,
}) => {
    await register(page);

    // A 1200x800 PNG, drawn in the page and handed to the box the way a paste does.
    await box(page).evaluate(async (node) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;

        const context = canvas.getContext('2d');

        if (context === null) {
            throw new Error('No canvas.');
        }

        context.fillStyle = '#e63946';
        context.fillRect(0, 0, 600, 800);
        context.fillStyle = '#264653';
        context.fillRect(600, 0, 600, 800);

        const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
                (made) =>
                    made === null
                        ? reject(new Error('No PNG.'))
                        : resolve(made),
                'image/png',
            ),
        );
        const data = new DataTransfer();
        data.items.add(new File([blob], 'big.png', { type: 'image/png' }));
        node.dispatchEvent(
            new ClipboardEvent('paste', {
                clipboardData: data,
                bubbles: true,
                cancelable: true,
            }),
        );
    });

    await expect(page.getByText('Stashed.')).toBeVisible();
    drainQueue();

    // The card asks again while the picture is being made; the small one comes first in the list.
    const picture = page.locator('[data-card] img');

    await expect(picture).toHaveAttribute('srcset', /^\S+ 400w, \S+ 640w$/, {
        timeout: 20_000,
    });
    await expect(picture).toHaveAttribute('loading', 'lazy');
    await expect(picture).toHaveAttribute('data-media', 'loaded');
});

test('a key belongs to a place: stash keys are silent on the feed, the sheet comes from the catalog', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'buy sourdough flour');

    // Out of the box, with nothing selected, the letters are typed into the box: no stash key does anything.
    await page.keyboard.press('Escape');
    await expect(box(page)).not.toBeFocused();
    await page.keyboard.type('to');
    await expect(box(page)).toHaveValue('to');
    await expect(page.getByLabel('Add a tag')).toHaveCount(0);
    await box(page).fill('');
    await expect(page).toHaveURL(/\/stashes$/);

    // Onto the cards the letters are shortcuts: g then c goes to the collections (and from every page without a box).
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('g');
    await page.keyboard.press('c');
    await expect(page).toHaveURL(/\/collections$/);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/stashes$/);

    // On a stash the stash keys work: t goes to the tags, and the sheet lists what the catalog says.
    await card(page, /buy sourdough flour/).click();
    await expect(page).toHaveURL(/\/stashes\/\d+$/);
    await page.keyboard.press('t');
    await expect(page.getByLabel('Add a tag')).toBeFocused();

    // Escape lets go of the field first, and the sheet has the next one.
    await page.keyboard.press('Escape');
    await page.keyboard.press('?');
    const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText('Undo a delete')).toBeVisible();
    await expect(sheet.getByText('Open the original')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(page).toHaveURL(/\/stashes\/\d+$/);

    // And back, when nothing else wants the key.
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/stashes$/);
});

test('the first suggestion is lit, Enter takes it, and the arrow keys never go above it', async ({
    page,
}) => {
    await register(page);

    await box(page).fill('bl');
    const blue = page.getByRole('option', { name: /blue/ });
    const black = page.getByRole('option', { name: /black/ });
    await expect(blue).toHaveAttribute('aria-selected', 'true');
    await expect(black).toHaveAttribute('aria-selected', 'false');

    await box(page).press('ArrowDown');
    await expect(black).toHaveAttribute('aria-selected', 'true');
    await box(page).press('ArrowUp');
    await box(page).press('ArrowUp');
    await expect(blue).toHaveAttribute('aria-selected', 'true');

    // Enter takes the lit one.
    await box(page).press('Enter');
    await expect(
        page.getByRole('button', { name: 'Remove blue' }),
    ).toBeVisible();
    await expect(box(page)).toHaveValue('');

    // Typing again lights the first one of the new list.
    await box(page).fill('not');
    await expect(page.getByRole('option', { name: /Notes/ })).toHaveAttribute(
        'aria-selected',
        'true',
    );
});

test('the kind of a link is a filter too: articles, products, videos and the like', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'buy sourdough flour');

    await box(page).fill('arti');
    const articles = page.getByRole('option', { name: /Articles/ });
    await expect(articles).toBeVisible();
    await expect(articles).toContainText('Kind');
    await box(page).press('Tab');

    await expect(
        page.getByRole('button', { name: 'Remove Articles' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/subtype=article/);
    await expect(page.getByText('Nothing matches.')).toBeVisible();

    // The chip goes with one Backspace, and the note is back.
    await box(page).press('Backspace');
    await expect(page).not.toHaveURL(/subtype=/);
    await expect(card(page, /buy sourdough flour/)).toBeVisible();
});
