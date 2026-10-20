import { expect, test, type Page } from '@playwright/test';
import { BASE_URL, box, capture, register } from './support';

/** The card of a stash in the feed, found by what it says. */
function card(page: Page, text: string | RegExp) {
    return page.getByRole('option', { name: text });
}

const grid = (page: Page) => page.locator('[data-stash-grid]');
const highlighted = (page: Page) =>
    page.locator('[data-card][data-highlighted]');

/** What the clipboard holds (the page may read it once the permission is given). */
async function clipboard(page: Page): Promise<string> {
    return page.evaluate(() => navigator.clipboard.readText());
}

test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
        origin: BASE_URL,
    });
});

test('the bar has the mark, the box and the menu on one line', async ({
    page,
}) => {
    await register(page);

    const header = page.locator('header');
    await expect(header.getByRole('link').first()).toBeVisible();
    await expect(header.getByRole('combobox')).toBeVisible();

    const mark = await header.getByRole('link').first().boundingBox();
    const field = await box(page).boundingBox();
    const menu = await page.getByRole('button', { name: 'Menu' }).boundingBox();

    expect(mark && field && menu).toBeTruthy();
    expect(Math.abs(mark!.y - menu!.y)).toBeLessThan(12);
    expect(Math.abs(field!.y - menu!.y)).toBeLessThan(12);
    expect(mark!.x).toBeLessThan(field!.x);
    expect(field!.x).toBeLessThan(menu!.x);
});

test('the account menu opens from the keyboard, closes with Escape and leads to the shortcuts page', async ({
    page,
}) => {
    await register(page);

    const button = page.getByRole('button', { name: 'Menu' });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(
        page.getByRole('menuitemcheckbox', { name: /Sounds/ }),
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(button).toBeFocused();

    await button.click();
    await page.getByRole('menuitem', { name: 'Shortcuts' }).click();
    await expect(page).toHaveURL(/\/shortcuts$/);
    await expect(
        page.getByRole('heading', { name: 'Shortcuts' }),
    ).toBeVisible();
    // The page lists the keys of the cards, and says what they do.
    await expect(page.getByText('Copy the link, color or text')).toBeVisible();
    await expect(
        page.getByText('Opens the address of the stash'),
    ).toBeVisible();
});

test('typing with nothing selected goes to the box, and the first letters are not lost', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'buy sourdough flour');

    // Let go of the box: nothing has the focus.
    await page.keyboard.press('Escape');
    await expect(box(page)).not.toBeFocused();

    // g, m and j are shortcuts further in; here they are letters.
    await page.keyboard.type('gmj ok');
    await expect(box(page)).toBeFocused();
    await expect(box(page)).toHaveValue('gmj ok');
    await expect(page).toHaveURL(/\/stashes(\?.*)?$/);

    // "/" is a shortcut, not a letter: it focuses the box and is not typed into it.
    await box(page).fill('');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(box(page)).not.toBeFocused();
    await page.keyboard.press('/');
    await expect(box(page)).toBeFocused();
    await expect(box(page)).toHaveValue('');

    // Inside the list the letters are shortcuts again, and nothing is typed.
    await page.keyboard.press('ArrowDown');
    await expect(grid(page)).toBeFocused();
    await page.keyboard.press('q');
    await expect(box(page)).toHaveValue('');
    await expect(grid(page)).toBeFocused();
});

test('the keyboard is back on the card that was opened', async ({ page }) => {
    await register(page);
    await capture(page, 'first note');
    await capture(page, 'second note');
    await capture(page, 'third note');

    // Third is the newest, first on the grid; open the second one with the keyboard.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect(highlighted(page)).toHaveAttribute('aria-label', /second/);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/stashes\/\d+$/);

    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/stashes$/);
    await expect(grid(page)).toBeFocused();
    await expect(highlighted(page)).toHaveAttribute('aria-label', /second/);

    // A click works the same way, and so does the back button of the browser.
    await card(page, /third note/).click();
    await expect(page).toHaveURL(/\/stashes\/\d+$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/stashes$/);
    await expect(grid(page)).toBeFocused();
    await expect(highlighted(page)).toHaveAttribute('aria-label', /third/);
});

test('a card has a menu: right-click, the Menu key, and the same actions as keys', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'call the plumber');
    await capture(page, 'https://example.test/sofa');
    await box(page).fill('#e63946');
    await box(page).press('Enter');
    await expect(box(page)).toHaveValue('');
    await page.evaluate(() => {
        const opened: unknown[][] = [];

        Object.assign(window, { opened });
        window.open = (...args: unknown[]) => {
            opened.push(args);

            return null;
        };
    });

    // The color: right-click, copy it.
    await page.locator('[data-card][data-type="color"]').click({
        button: 'right',
    });
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(
        page.getByRole('menuitem', { name: /^Open link/ }),
    ).toHaveCount(0);
    await page.getByRole('menuitem', { name: /^Copy color/ }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    expect(await clipboard(page)).toBe('#e63946');
    await expect(grid(page)).toBeFocused();

    // The link (the middle card): the keys copy and open it, and the menu lists them.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('c');
    await expect.poll(() => clipboard(page)).toBe('https://example.test/sofa');
    await page.keyboard.press('o');
    await expect
        .poll(() =>
            page.evaluate(() =>
                (window as unknown as { opened: unknown[][] }).opened.map(
                    (call) => call[0],
                ),
            ),
        )
        .toEqual(['https://example.test/sofa']);

    // The note (the last card): its text, with the key and no menu.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('c');
    await expect.poll(() => clipboard(page)).toBe('call the plumber');

    // The Menu key of the keyboard (Shift+F10) opens the menu of the card the keyboard is on.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Shift+F10');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(
        page.getByRole('menuitem', { name: /^Open link/ }),
    ).toBeVisible();
    await expect(
        page.getByRole('menuitem', { name: /^Copy link/ }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(grid(page)).toBeFocused();
    await page.keyboard.press('ContextMenu');
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);

    // Delete from the menu of a card: it goes at once and the note offers the undo.
    await card(page, /call the plumber/).click({ button: 'right' });
    await page.getByRole('menuitem', { name: /^Delete/ }).click();
    await expect(card(page, /call the plumber/)).toHaveCount(0);
    // The request is on the server's queue of work after the card is gone; give it room on a busy machine.
    await expect(page.getByText('Deleted.')).toBeVisible({ timeout: 15_000 });
});

test('a ? as the first key of an empty box shows the shortcuts, and is a character after that', async ({
    page,
}) => {
    await register(page);
    const sheet = page.getByRole('region', { name: 'Keyboard shortcuts' });

    await expect(box(page)).toBeFocused();
    await page.keyboard.press('?');
    await expect(sheet).toBeVisible();
    await expect(box(page)).toHaveValue('');

    // The box let go, so one Escape closes the sheet.
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);

    // After another character it is a ? like any other.
    await box(page).focus();
    await page.keyboard.type('why?');
    await expect(box(page)).toHaveValue('why?');
    await expect(sheet).toHaveCount(0);
});
