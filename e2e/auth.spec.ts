import { expect, test } from '@playwright/test';
import { menu, register } from './support';

test('guests are sent to the login page and see no provider buttons without OAuth apps', async ({
    page,
}) => {
    await page.goto('/stashes');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Continue with/ })).toHaveCount(
        0,
    );
});

test('a person can sign up, see an empty feed, log out and log in again', async ({
    page,
}) => {
    const person = await register(page);

    await expect(page.getByText('Nothing here yet')).toBeVisible();

    await menu(page, 'Log out');
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/login');
    await page.getByLabel('Email address').fill(person.email);
    await page.getByLabel('Password', { exact: true }).fill(person.password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/stashes$/);
});
