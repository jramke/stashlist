import { expect, test } from '@playwright/test';
import { menu, register } from './support';

test('an API token is shown once, works until it is revoked', async ({
    page,
    request,
}) => {
    await register(page);

    await menu(page, 'Settings');
    await page.getByRole('link', { name: 'API tokens' }).click();
    await expect(page.getByText('No tokens yet.')).toBeVisible();

    await page.getByLabel('Name of the app').fill('Chrome on my MacBook');
    await page.getByRole('button', { name: 'Create token' }).click();

    const shown = page.getByLabel('Your new token');
    await expect(shown).toHaveValue(/^\d+\|stl_[A-Za-z0-9]+$/);
    const token = await shown.inputValue();

    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
    };
    const me = await request.get('/api/v1/me', { headers });
    expect(me.ok()).toBe(true);
    expect(await me.json()).toMatchObject({ name: 'E2E Person' });

    // The secret is gone after the next visit; the token stays in the list.
    await page.reload();
    await expect(page.getByLabel('Your new token')).toHaveCount(0);
    await expect(page.getByText('Chrome on my MacBook')).toBeVisible();

    const revoke = page.getByRole('button', {
        name: 'Revoke Chrome on my MacBook',
    });
    // Two presses: the first one only asks.
    await revoke.click();
    await revoke.click();
    await expect(page.getByText('No tokens yet.')).toBeVisible();

    const revoked = await request.get('/api/v1/me', { headers });
    expect(revoked.status()).toBe(401);
});
