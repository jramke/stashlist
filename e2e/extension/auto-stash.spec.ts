import { BASE_URL } from '../support';
import { expect, test, type Extension } from './fixture';
import { connect, openExtensionPage } from './helpers';

/** A post on X: the bookmark button turns into the one that undoes it, as on the real site. */
function post(handle: string, id: string, text: string): string {
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>X</title></head><body>
<article data-testid="tweet">
    <a href="/${handle}/status/${id}"><time datetime="2026-10-20T08:00:00Z">1h</time></a>
    <div data-testid="tweetText">${text}</div>
    <button data-testid="bookmark" onclick="this.dataset.testid = 'removeBookmark'">Bookmark</button>
</article>
</body></html>`;
}

const FIRST = 'Sourdough starters like warm kitchens';
const SECOND = 'Rye needs a longer rest than wheat';

/** The page scripts the extension has registered, asked of its service worker. */
function registered(extension: Extension): Promise<string[]> {
    return extension.worker.evaluate(async () => {
        const { chrome } = globalThis as unknown as {
            chrome: {
                scripting: {
                    getRegisteredContentScripts: () => Promise<
                        { id: string }[]
                    >;
                };
            };
        };

        return (await chrome.scripting.getRegisteredContentScripts()).map(
            ({ id }) => id,
        );
    });
}

test('a bookmark on X is stashed from the install on, and not once the site is turned off', async ({
    extension,
}) => {
    const { web } = await connect(extension);
    await extension.context.route('https://x.com/**', (route) =>
        route.fulfill({
            contentType: 'text/html',
            body: route.request().url().endsWith('/home')
                ? post('ada', '123', FIRST)
                : post('bob', '456', SECOND),
        }),
    );

    // Nothing was turned on: every site is on, and its script is registered by the browser.
    await expect
        .poll(() => registered(extension))
        .toEqual(
            expect.arrayContaining([
                'auto-stash-github',
                'auto-stash-x',
                'auto-stash-youtube',
            ]),
        );

    const options = await openExtensionPage(extension, 'options.html');
    const x = () => options.getByRole('checkbox', { name: /^X/ });
    await expect(x()).toBeChecked();

    // The save runs in the background after the click; look again until the feed has it.
    async function stashed(text: string): Promise<void> {
        await expect(async () => {
            await web.goto(`${BASE_URL}/stashes`);
            await expect(
                web.locator('[data-card]').filter({ hasText: text }).first(),
            ).toBeVisible({ timeout: 1000 });
        }).toPass({ timeout: 15_000 });
    }

    const open = await extension.context.newPage();
    await open.goto('https://x.com/home');
    await open.getByRole('button', { name: 'Bookmark' }).click();
    await stashed(FIRST);

    // Turned off: the script of that site goes, the others stay, and the choice is kept.
    await options.bringToFront();
    await x().click();
    await expect(x()).not.toBeChecked();
    await expect
        .poll(() => registered(extension))
        .not.toContain('auto-stash-x');
    expect(await registered(extension)).toContain('auto-stash-github');

    await options.reload();
    await expect(x()).not.toBeChecked();

    // Turned on again: a tab that is open already gets the script at once.
    const later = await extension.context.newPage();
    await later.goto('https://x.com/bob/status/456');
    await options.bringToFront();
    await x().click();
    await expect(x()).toBeChecked();
    await expect.poll(() => registered(extension)).toContain('auto-stash-x');

    await later.bringToFront();
    await later.getByRole('button', { name: 'Bookmark' }).click();
    await stashed(SECOND);
});
