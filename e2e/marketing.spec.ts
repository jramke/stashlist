import { expect, test } from '@playwright/test';
import { BASE_URL } from './support';

test('the front page invites a guest in and its vault keeps what is clicked', async ({
    page,
}) => {
    await page.goto(`${BASE_URL}/`);

    await expect(
        page.getByRole('heading', {
            name: 'A place for everything worth keeping.',
        }),
    ).toBeVisible();
    await expect(
        page.getByRole('link', { name: 'Get started' }).first(),
    ).toBeVisible();

    // Nine things around the vault, each a real button.
    await expect(page.getByRole('button', { name: /^Keep / })).toHaveCount(9);
    await expect(page.getByText('Your stash')).toBeVisible();

    // The icons float, and Playwright will not click what keeps moving: force it, a hand would not mind.
    await page
        .getByRole('button', { name: 'Keep a link' })
        .click({ force: true });
    await expect(page.getByText('1 kept')).toBeVisible();

    await page
        .getByRole('button', { name: 'Keep a color' })
        .click({ force: true });
    await expect(page.getByText('2 kept')).toBeVisible();
});

test('the vault works from the keyboard and with reduced motion, where nothing moves', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${BASE_URL}/`);

    const note = page.getByRole('button', { name: 'Keep a note' });
    await note.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText('1 kept')).toBeVisible();
    // No animation was started on the button.
    expect(
        await note.evaluate((node) => getComputedStyle(node).animationName),
    ).toBe('none');
});

test('the public pages open, say who they are and are found by crawlers', async ({
    page,
    request,
}) => {
    for (const [path, heading] of [
        ['/pricing', 'Pricing'],
        ['/extension', 'Browser extension'],
        ['/docs', 'Docs'],
        ['/privacy', 'Privacy'],
        ['/terms', 'Terms'],
        ['/imprint', 'Imprint'],
        ['/changelog', 'Changelog'],
    ] as const) {
        await page.goto(`${BASE_URL}${path}`);
        await expect(
            page.getByRole('heading', { name: heading, level: 1 }),
        ).toBeVisible();
        await expect(page.locator('meta[name="description"]')).toHaveAttribute(
            'content',
            /.+/,
        );
    }

    expect(
        await (await request.get(`${BASE_URL}/sitemap.xml`)).text(),
    ).toContain('/pricing');
    expect(
        await (await request.get(`${BASE_URL}/robots.txt`)).text(),
    ).toContain('Disallow: /stashes');
    // Off until the operator has checked it.
    expect((await request.get(`${BASE_URL}/mymind-alternative`)).status()).toBe(
        404,
    );
});
