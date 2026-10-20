import { BASE_URL } from '../support';
import { expect, test } from './fixture';
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

test('a bookmark on a site that is turned on stashes the post', async ({
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

    const options = await openExtensionPage(extension, 'options.html');
    const x = options.getByRole('checkbox', { name: /^X/ });
    await expect(x).not.toBeChecked();

    // Open before it is turned on: the script is put into this tab right away.
    const open = await extension.context.newPage();
    await open.goto('https://x.com/home');
    await options.bringToFront();
    await x.click();
    await expect(x).toBeChecked();

    await options.reload();
    await expect(options.getByRole('checkbox', { name: /^X/ })).toBeChecked();

    // The save runs in the background after the click; look again until the feed has it.
    async function stashed(text: string): Promise<void> {
        await expect(async () => {
            await web.goto(`${BASE_URL}/stashes`);
            await expect(
                web.locator('[data-card]').filter({ hasText: text }).first(),
            ).toBeVisible({ timeout: 1000 });
        }).toPass({ timeout: 15_000 });
    }

    await open.bringToFront();
    await open.getByRole('button', { name: 'Bookmark' }).click();
    await stashed(FIRST);

    // A page opened after it was turned on gets the script from the browser itself.
    const later = await extension.context.newPage();
    await later.goto('https://x.com/bob/status/456');
    await later.getByRole('button', { name: 'Bookmark' }).click();
    await stashed(SECOND);
});
