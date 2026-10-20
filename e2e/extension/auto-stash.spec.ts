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

// The end-to-end build may read every page and cannot give that back, so every site is allowed from the start:
// what the flow shows is the part after the permission (the scripts follow it, the button is seen, the post is
// stashed). The prompt itself is the browser's.
test('a bookmark on X is stashed on a page that was open and on one opened later', async ({
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

    // The background registers a script for every site that is allowed.
    await expect
        .poll(() => registered(extension))
        .toEqual(
            expect.arrayContaining([
                'auto-stash-github',
                'auto-stash-x',
                'auto-stash-youtube',
            ]),
        );

    // The options page tells the same, for the sites and for all of them.
    const options = await openExtensionPage(extension, 'options.html');
    await expect(options.getByRole('checkbox', { name: /^X/ })).toBeChecked();
    await expect(
        options.getByRole('checkbox', { name: 'All sites', exact: true }),
    ).toBeChecked();

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

    const later = await extension.context.newPage();
    await later.goto('https://x.com/bob/status/456');
    await later.getByRole('button', { name: 'Bookmark' }).click();
    await stashed(SECOND);
});
