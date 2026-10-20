import { expect, test } from '@playwright/test';
import { capture, menu, register } from './support';

test('tags are searched by their names and merged by typing the name of the other one', async ({
    page,
}) => {
    await register(page);
    await capture(page, 'buy sourdough flour');
    await page.getByRole('option', { name: /sourdough/ }).click();
    await expect(page).toHaveURL(/\/stashes\/\d+$/);

    for (const tag of ['kitchen', 'garden', 'garage']) {
        await page.getByLabel('Add a tag').fill(tag);
        await page.getByLabel('Add a tag').press('Enter');
        await expect(
            page.getByText(new RegExp(`^${tag}$`, 'i')).first(),
        ).toBeVisible();
    }

    await menu(page, 'Tags');
    await expect(page).toHaveURL(/\/tags$/);
    await expect(page.getByLabel('Name of kitchen')).toBeVisible();

    // The search narrows the list after a short pause, and keeps the field.
    const search = page.getByLabel('Search tags');
    await search.fill('GA');
    await expect(page).toHaveURL(/q=GA/);
    await expect(page.getByLabel('Name of garden')).toBeVisible();
    await expect(page.getByLabel('Name of garage')).toBeVisible();
    await expect(page.getByLabel('Name of kitchen')).toHaveCount(0);
    await expect(search).toHaveValue('GA');

    await search.fill('zzz');
    await expect(page.getByText('No tag has "zzz" in its name.')).toBeVisible();
    await search.fill('');
    await expect(page.getByLabel('Name of kitchen')).toBeVisible();

    // The names for merging come when the field is first used; typing a whole name and Enter picks it.
    const merge = page.getByLabel('Merge garage into');
    await merge.fill('garden');
    await expect(page.locator('#tag-options option').first()).toBeAttached();
    await merge.press('Enter');
    await page.getByRole('button', { name: 'Merge into garden' }).click();
    await expect(page.getByLabel('Name of garage')).toHaveCount(0);
    await expect(page.getByLabel('Name of garden')).toBeVisible();
});
