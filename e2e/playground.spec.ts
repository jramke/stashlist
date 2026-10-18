import { expect, test } from '@playwright/test';
import { BASE_URL, register } from './support';

test('the card playground draws every section and its pipeline runs', async ({
    page,
}) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => errors.push(error.message));

    await register(page);
    await page.goto(`${BASE_URL}/playground/cards`);

    await expect(
        page.getByRole('heading', { name: 'Stash cards' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Phases' })).toBeVisible();
    await expect(page.locator('[data-card]').first()).toBeVisible();

    // A stash that fails its pipeline: the same card, in another phase.
    await page.getByRole('button', { name: 'Fail it' }).click();
    await expect(page.getByText('failed', { exact: true })).toBeVisible();

    expect(errors).toEqual([]);
});
