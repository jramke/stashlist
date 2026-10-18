import { expect, test } from '@playwright/test';
import { BASE_URL, capture, drainQueue, menu, register } from './support';

test('smart features are one switch of the account', async ({ page }) => {
    await register(page);

    await menu(page, 'Settings');
    const smart = page.getByRole('checkbox', {
        name: /Use AI to tag and summarize/,
    });
    await expect(smart).toBeChecked();

    await smart.click();
    await expect(page.getByText('Saved.')).toBeVisible();

    await page.reload();
    await expect(
        page.getByRole('checkbox', { name: /Use AI to tag and summarize/ }),
    ).not.toBeChecked();

    // Nothing on the capture box or a stash asks about it any more.
    await page.goto('/stashes');
    await expect(
        page.getByText(/no smart features for this stash/i),
    ).toHaveCount(0);
});

test('deleting the account locks it at once and removes everything', async ({
    page,
}) => {
    const person = await register(page);
    await capture(page, 'a note that will be removed with the account');

    await menu(page, 'Settings');
    await page.getByLabel('Your password').fill(person.password);
    // Two presses: the first one only asks.
    await page.getByRole('button', { name: 'Delete my account' }).click();
    await page.getByRole('button', { name: /Everything goes/ }).click();

    // Signed out, back on the front page.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/being deleted/i)).toBeVisible();

    // The account cannot be used any more, even before the job has run.
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Email address').fill(person.email);
    await page.getByLabel('Password', { exact: true }).fill(person.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/login$/);

    // After the job the account does not exist.
    drainQueue();
    await page.getByLabel('Email address').fill(person.email);
    await page.getByLabel('Password', { exact: true }).fill(person.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByText(/do not match|credentials/i)).toBeVisible();
});
