import { expect, test, type Page } from '@playwright/test';
import { capture, holdRequests, register, watch } from './support';

/** The requests that put a stash into collections. */
const COLLECTIONS = /\/stashes\/\d+\/collections$/;

/** Signs up, stashes a note, makes the collections and opens the note: the stash page, with a pill for each. */
async function openNote(page: Page, collections: string[]): Promise<void> {
    await register(page);
    await capture(page, 'buy sourdough flour');

    await page.goto('/collections');

    for (const name of collections) {
        await page.getByLabel('Name of a new collection').fill(name);
        await page.getByRole('button', { name: 'Create' }).click();
        await expect(page.getByLabel(`Name of ${name}`)).toBeVisible();
    }

    await page.goto('/stashes');
    await page.getByRole('option', { name: 'buy sourdough flour' }).click();
    await expect(page).toHaveURL(/\/stashes\/\d+$/);
    // The page is built again once, a moment after it opens, and a node watched or a text typed before that is
    // lost with the first one: wait until the network is quiet.
    await page.waitForLoadState('networkidle');
}

function pill(page: Page, name: string) {
    return page.getByRole('checkbox', { name });
}

/** Resolves when the server has answered a press (the answer of the next one is another call). */
function pressAnswered(page: Page) {
    return page.waitForResponse(
        (response) =>
            response.request().method() === 'PUT' &&
            COLLECTIONS.test(response.url()),
    );
}

test('a pill that was pressed stays pressed while the answer to something else comes in', async ({
    page,
}) => {
    await openNote(page, ['Kitchen']);
    await holdRequests(page, COLLECTIONS, 'PUT', 1200);

    const stop = await watch(pill(page, 'Kitchen'), 'checked');
    const answered = pressAnswered(page);
    await pill(page, 'Kitchen').click();

    // The tag is saved and answered while the press is still out, and the list in that answer is still empty.
    await page.getByLabel('Add a tag').fill('Baking');
    await page.getByLabel('Add a tag').press('Enter');
    await expect(page.getByText(/^baking$/i).first()).toBeVisible();
    await answered;

    expect(await stop()).toEqual(['false', 'true']);

    await page.reload();
    await expect(pill(page, 'Kitchen')).toBeChecked();
});

test('two presses in a row are both kept while their answers come in', async ({
    page,
}) => {
    await openNote(page, ['Kitchen', 'Garden']);
    await holdRequests(page, COLLECTIONS, 'PUT', 800);

    const stopKitchen = await watch(pill(page, 'Kitchen'), 'checked');
    const stopGarden = await watch(pill(page, 'Garden'), 'checked');

    let answers = 0;
    page.on('response', (response) => {
        if (
            response.request().method() === 'PUT' &&
            COLLECTIONS.test(response.url())
        ) {
            answers++;
        }
    });

    await pill(page, 'Kitchen').click();
    await pill(page, 'Garden').click();

    // The first answer lists one collection: the second pill must not go out and come back.
    await expect.poll(() => answers).toBe(2);

    expect(await stopKitchen()).toEqual(['false', 'true']);
    expect(await stopGarden()).toEqual(['false', 'true']);

    await page.reload();
    await expect(pill(page, 'Kitchen')).toBeChecked();
    await expect(pill(page, 'Garden')).toBeChecked();
});

test('a press the server refuses puts the pill back and says so, and a second press goes through', async ({
    page,
}) => {
    await openNote(page, ['Kitchen']);

    let broken = true;

    // The refusal comes after a moment, so the pressed pill is on screen for a few frames before it goes.
    await page.route(COLLECTIONS, async (route) => {
        if (broken && route.request().method() === 'PUT') {
            await new Promise((resolve) => setTimeout(resolve, 300));
            await route.fulfill({
                status: 500,
                contentType: 'text/html',
                body: '<h1>Server Error</h1>',
            });

            return;
        }

        await route.continue();
    });

    const stop = await watch(pill(page, 'Kitchen'), 'checked');
    await pill(page, 'Kitchen').click();

    await expect(page.getByRole('alert')).toHaveText(
        'This could not be saved.',
    );
    await expect(pill(page, 'Kitchen')).not.toBeChecked();
    expect(await stop()).toEqual(['false', 'true', 'false']);
    // The pill says it itself: no error page on top of the stash.
    await expect(page.locator('iframe')).toHaveCount(0);

    broken = false;
    const answered = pressAnswered(page);
    await pill(page, 'Kitchen').click();

    await expect(pill(page, 'Kitchen')).toBeChecked();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await answered;

    await page.reload();
    await expect(pill(page, 'Kitchen')).toBeChecked();
});

test('a list the server changes shows in pills nobody pressed', async ({
    page,
}) => {
    await openNote(page, ['Kitchen']);

    // The stash joins the collection in a second tab...
    const other = await page.context().newPage();
    await other.goto(page.url());
    const saved = pressAnswered(other);
    await pill(other, 'Kitchen').click();
    await saved;
    await other.close();

    // ...and the first tab learns of it with the next answer it gets.
    await page.getByLabel('Add a tag').fill('Baking');
    await page.getByLabel('Add a tag').press('Enter');
    await expect(pill(page, 'Kitchen')).toBeChecked();
});
