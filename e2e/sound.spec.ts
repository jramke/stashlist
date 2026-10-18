import { expect, test, type Page } from '@playwright/test';
import { box, register } from './support';

/** Counts the sound sources the page creates, which is as close to hearing it as a test gets. */
async function countVoices(page: Page) {
    await page.addInitScript(() => {
        Reflect.set(window, '__voices', 0);

        for (const name of ['createBufferSource', 'createOscillator']) {
            const original: unknown = Reflect.get(AudioContext.prototype, name);

            if (typeof original !== 'function') {
                continue;
            }

            Reflect.set(
                AudioContext.prototype,
                name,
                function (this: AudioContext) {
                    Reflect.set(
                        window,
                        '__voices',
                        Reflect.get(window, '__voices') + 1,
                    );

                    return Reflect.apply(original, this, []);
                },
            );
        }
    });
}

async function voices(page: Page): Promise<number> {
    return page.evaluate(() => Reflect.get(window, '__voices'));
}

const sounds = (page: Page) =>
    page.getByRole('menuitemcheckbox', { name: /Sounds/ });

test('keys click while typing, and muting sticks across a reload', async ({
    page,
}) => {
    await countVoices(page);
    await register(page);

    // The synthesizer loads after the page; keep typing until it is there.
    const before = await voices(page);
    await expect
        .poll(async () => {
            await box(page).press('x');

            return voices(page);
        })
        .toBeGreaterThan(before);
    await box(page).fill('');

    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(sounds(page)).toHaveAttribute('aria-checked', 'true');
    await sounds(page).click();

    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(sounds(page)).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('Escape');

    const muted = await voices(page);
    await box(page).pressSequentially('abc');
    expect(await voices(page)).toBe(muted);

    await page.reload();
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(sounds(page)).toHaveAttribute('aria-checked', 'false');
});

test('with reduced motion the app starts quiet, and m turns it on', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await countVoices(page);
    await register(page);

    const before = await voices(page);
    await box(page).pressSequentially('hi');
    expect(await voices(page)).toBe(before);

    // Out of the box, then the shortcut.
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.keyboard.press('m');
    await expect(page.getByText('Sounds on')).toBeVisible();

    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(sounds(page)).toHaveAttribute('aria-checked', 'true');
});
