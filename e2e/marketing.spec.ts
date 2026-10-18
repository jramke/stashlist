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

    // Nine things around the vault, each a real button; pressing one puffs it into the logo and sends it in.
    await expect(page.getByRole('button', { name: /^Keep / })).toHaveCount(9);

    // The icons float, and Playwright will not click what keeps moving: force it, a hand would not mind.
    await page
        .getByRole('button', { name: 'Keep a repository' })
        .click({ force: true });
    await expect(page.getByRole('button', { name: /^Keep / })).toHaveCount(8);

    await page
        .getByRole('button', { name: 'Keep a palette' })
        .click({ force: true });
    await expect(page.getByRole('button', { name: /^Keep / })).toHaveCount(7);

    // Every puff has a drawing surface: a canvas measured while hidden is 0 by 0 and shows nothing (this once
    // broke every icon after the first).
    await page.waitForTimeout(500);
    expect(
        await page.evaluate(() =>
            Array.from(document.querySelectorAll('canvas')).every(
                (canvas) => canvas.width > 0 && canvas.height > 0,
            ),
        ),
    ).toBe(true);
});

test('the vault works from the keyboard and with reduced motion, where nothing moves', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${BASE_URL}/`);

    const note = page.getByRole('button', { name: 'Keep a note' });

    // Nothing floats.
    expect(
        await note.evaluate(
            (node) =>
                getComputedStyle(node.closest('.animate-float') ?? node)
                    .animationName,
        ),
    ).toBe('none');

    await note.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('button', { name: /^Keep / })).toHaveCount(8);
    await expect(page.getByText('Kept 1 of 9.')).toBeAttached();
});

test('the public pages have one size of type', async ({ page }) => {
    for (const path of ['/', '/pricing', '/docs', '/extension', '/privacy']) {
        await page.goto(`${BASE_URL}${path}`);

        // Every element that holds text of its own.
        const sizes = await page.evaluate(() => {
            const found = new Set<string>();

            for (const node of document.querySelectorAll('body *')) {
                const hasText = Array.from(node.childNodes).some(
                    (child) =>
                        child.nodeType === Node.TEXT_NODE &&
                        (child.textContent ?? '').trim() !== '',
                );

                if (hasText && !['SCRIPT', 'STYLE'].includes(node.tagName)) {
                    found.add(getComputedStyle(node).fontSize);
                }
            }

            return Array.from(found);
        });

        expect(sizes, path).toHaveLength(1);
    }
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
