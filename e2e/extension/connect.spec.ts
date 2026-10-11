import { BASE_URL, register } from '../support';
import { expect, test } from './fixture';
import { openExtensionPage } from './helpers';

test('one click on Connect makes a token of its own and fills the options in', async ({
    extension,
}) => {
    const web = await extension.context.newPage();
    const person = await register(web);

    const options = await openExtensionPage(extension, 'options.html');
    await options.getByLabel('Address of your Stashlist').fill(BASE_URL);

    // The browser opens its sign-in window; the person is signed in already.
    const [window] = await Promise.all([
        extension.context.waitForEvent('page'),
        options.getByRole('button', { name: 'Connect to Stashlist' }).click(),
    ]);
    await window.getByRole('button', { name: 'Connect', exact: true }).click();

    await expect(
        options.getByText(`Connected as ${person.name}`),
    ).toBeVisible();

    await web.goto(`${BASE_URL}/settings/tokens`);
    await expect(web.getByText('Chrome extension')).toBeVisible();
});
