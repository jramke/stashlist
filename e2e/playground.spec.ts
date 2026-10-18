import { expect, test } from '@playwright/test';
import { BASE_URL, register } from './support';

test('the card playground opens without a word in the console, runs its pipeline and loads the lost pictures on a click', async ({
    page,
}) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') {
            errors.push(message.text());
        }
    });

    await register(page);
    await page.goto(`${BASE_URL}/playground/cards`);

    await expect(
        page.getByRole('heading', { name: 'Stash cards' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Phases' })).toBeVisible();
    await expect(page.locator('[data-card]').first()).toBeVisible();

    // A stash that fails its pipeline: the same card, in another phase.
    const live = page.locator('section').filter({
        has: page.getByRole('heading', { name: 'The pipeline, live' }),
    });

    await page.getByRole('button', { name: 'Fail it' }).click();
    await expect(live.getByText('failed', { exact: true })).toBeVisible();

    // The pictures that fail are not asked for until a click: the browser would log their 404 and 500.
    expect(errors).toEqual([]);

    await page.getByRole('button', { name: 'Load the pictures' }).click();
    await expect(page.getByText('slow (6 s)')).toBeVisible();
    await expect(page.getByText('404', { exact: true })).toBeVisible();
    await expect(page.getByText('500', { exact: true })).toBeVisible();
});
