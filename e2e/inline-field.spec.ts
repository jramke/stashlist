import { expect, test, type Locator, type Page } from '@playwright/test';
import { capture, register } from './support';

/** Signs up, stashes a note and opens it: the stash page, where the title and the text save themselves. */
async function openNote(page: Page, text: string): Promise<void> {
    await register(page);
    await capture(page, text);
    await page.getByRole('option', { name: text }).click();
    await expect(page).toHaveURL(/\/stashes\/\d+$/);
}

/** The requests that save a field of the stash page. */
const SAVES = /\/stashes\/\d+$/;

/** Holds every save for a while before it reaches the server, so there is time to type while one is out. */
async function holdSaves(page: Page, milliseconds: number): Promise<void> {
    await page.route(SAVES, async (route) => {
        if (route.request().method() === 'PATCH') {
            await new Promise((resolve) => setTimeout(resolve, milliseconds));
        }

        await route.continue();
    });
}

/**
 * Notes what a field shows at every frame from now on. The function it returns ends the watch a few frames later
 * and says what the field showed, one value after the other: a text that comes back for a moment is in the list.
 */
async function watch(field: Locator): Promise<() => Promise<string[]>> {
    const probe = await field.evaluateHandle((node) => {
        if (!(
            node instanceof HTMLInputElement ||
            node instanceof HTMLTextAreaElement
        )) {
            throw new Error('Not a text field.');
        }

        const shown = [node.value];
        let running = true;
        const frame = () => {
            if (node.value !== shown[shown.length - 1]) {
                shown.push(node.value);
            }

            if (running) {
                requestAnimationFrame(frame);
            }
        };

        requestAnimationFrame(frame);

        return {
            stop: async () => {
                for (let i = 0; i < 4; i++) {
                    await new Promise((resolve) =>
                        requestAnimationFrame(resolve),
                    );
                }

                running = false;

                return shown;
            },
        };
    });

    return () => probe.evaluate((watching) => watching.stop());
}

test('the title shows what was typed from the first key to the answer of the server', async ({
    page,
}) => {
    await openNote(page, 'buy sourdough flour');
    const title = page.getByLabel('Title', { exact: true });

    await title.fill('First title');
    await title.blur();
    await expect(page).toHaveTitle(/First title/);

    // Saved by the pause: the save leaves 700 ms after the last key, and the old text must not come back
    // while it is out.
    let stop = await watch(title);
    await title.fill('Second title');
    await expect(page).toHaveTitle(/Second title/);
    expect(await stop()).toEqual(['First title', 'Second title']);

    // Saved by leaving the field.
    stop = await watch(title);
    await title.fill('Third title');
    await title.blur();
    await expect(page).toHaveTitle(/Third title/);
    expect(await stop()).toEqual(['Second title', 'Third title']);
});

test('the text of a note shows what was typed while it saves', async ({
    page,
}) => {
    await openNote(page, 'buy sourdough flour');
    const text = page.getByLabel('Text', { exact: true });

    const stop = await watch(text);
    await text.fill('buy sourdough flour and yeast');
    await expect(page.getByText('Saved.')).toBeVisible();

    expect(await stop()).toEqual([
        'buy sourdough flour',
        'buy sourdough flour and yeast',
    ]);
});

test('text typed while a save is on its way is kept, and saved after it', async ({
    page,
}) => {
    await openNote(page, 'buy sourdough flour');
    const title = page.getByLabel('Title', { exact: true });

    await holdSaves(page, 600);

    const out = page.waitForRequest((request) => request.method() === 'PATCH');
    await title.fill('Sour');
    const stop = await watch(title);
    await out;
    await title.pressSequentially('dough');

    // The answer to the first save (a title of "Sour") arrives while the field says "Sourdough".
    await expect(page).toHaveTitle(/Sourdough/);

    const shown = await stop();

    expect(shown[0]).toBe('Sour');
    expect(
        shown.every(
            (text) => text.startsWith('Sour') && 'Sourdough'.startsWith(text),
        ),
        shown.join(' | '),
    ).toBe(true);

    await page.reload();
    await expect(title).toHaveValue('Sourdough');
});

test('the old text put back while a save is on its way is saved too', async ({
    page,
}) => {
    await openNote(page, 'buy sourdough flour');
    const title = page.getByLabel('Title', { exact: true });

    await title.fill('Old');
    await title.blur();
    await expect(page).toHaveTitle(/Old/);

    // Short enough for the answer to come back before the put-back is saved, which is 700 ms after it was typed.
    await holdSaves(page, 200);

    const out = page.waitForRequest((request) => request.method() === 'PATCH');
    await title.fill('Older');
    await out;

    // Back to what the server has said all along, while the save of "Older" is held: its answer says "Older",
    // and the field, which holds the text the person put back, must not follow it.
    const putBack = page.waitForRequest((request) => {
        if (request.method() !== 'PATCH') {
            return false;
        }

        const sent: { title?: string } = request.postDataJSON();

        return sent.title === 'Old';
    });
    await title.fill('Old');
    const saved = await putBack;

    await page.waitForResponse((response) => response.request() === saved);
    await expect(title).toHaveValue('Old');

    await page.reload();
    await expect(title).toHaveValue('Old');
});

test('a save the server refuses keeps what was typed, says why, and goes through once the text is fine', async ({
    page,
}) => {
    await openNote(page, 'buy sourdough flour');
    const text = page.getByLabel('Text', { exact: true });

    const stop = await watch(text);
    await text.fill('');

    await expect(page.getByRole('alert')).toHaveText('A note cannot be empty.');
    // The empty field stays empty: the text of the note does not come back behind the message.
    expect(await stop()).toEqual(['buy sourdough flour', '']);

    await text.fill('buy rye flour');
    await expect(page.getByText('Saved.')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(text).toHaveValue('buy rye flour');
});

test('a save that fails on the server keeps the typed title and shows the error, and leaving the field tries again', async ({
    page,
}) => {
    await openNote(page, 'buy sourdough flour');
    const title = page.getByLabel('Title', { exact: true });

    let broken = true;

    await page.route(SAVES, (route) =>
        broken && route.request().method() === 'PATCH'
            ? route.fulfill({
                  status: 500,
                  contentType: 'text/html',
                  body: '<h1>Server Error</h1>',
              })
            : route.continue(),
    );

    const stop = await watch(title);
    await title.fill('Lost title');
    await title.blur();

    await expect(page.getByRole('alert')).toHaveText(
        'This could not be saved.',
    );
    await expect(title).toHaveValue('Lost title');
    expect(await stop()).toEqual(['', 'Lost title']);
    // The field says it itself: no error page on top of the stash.
    await expect(page.locator('iframe')).toHaveCount(0);

    broken = false;
    await title.focus();
    await title.blur();

    await expect(page.getByText('Saved.')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page).toHaveTitle(/Lost title/);
});

test('a title the server changes shows in a field nobody touched', async ({
    page,
}) => {
    await openNote(page, 'buy sourdough flour');
    const title = page.getByLabel('Title', { exact: true });
    const text = page.getByLabel('Text', { exact: true });

    // The title changes behind the page's back (a second tab; for a link, the page being read)...
    const token = (await page.context().cookies()).find(
        (cookie) => cookie.name === 'XSRF-TOKEN',
    );
    await page.request.patch(page.url(), {
        headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': decodeURIComponent(token?.value ?? ''),
        },
        data: { title: 'From elsewhere' },
    });

    // ...and reaches the open page with the answer to its next save.
    await text.fill('buy sourdough flour and yeast');
    await expect(title).toHaveValue('From elsewhere');
});
