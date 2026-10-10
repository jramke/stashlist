import { expect, test } from '@playwright/test';
import { register } from './support';

test('smart features are one switch of the account', async ({ page }) => {
    await register(page);

    await page.getByRole('link', { name: 'E2E Person' }).click();
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
    await page.getByRole('link', { name: 'All stashes' }).click();
    await expect(
        page.getByText(/no smart features for this stash/i),
    ).toHaveCount(0);
});
