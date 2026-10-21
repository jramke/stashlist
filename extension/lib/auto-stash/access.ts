import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import { originsOf, PLATFORMS, type Platform } from './platforms';

/**
 * "Stash when I save" is on for a site when the person turned it on AND the browser lets the extension see that
 * site. The choice is stored on its own because the permission cannot be the switch: a broader permission (all
 * sites, for showing highlights) allows the site without the person asking for this, and it cannot be given back
 * site by site. The background (`watchAutoStash`) makes the page scripts follow both, so the switch also gives
 * way when the permission is taken away on the browser's own page.
 */
const onItem = storage.defineItem<string[]>('local:auto-stash-on', {
    fallback: [],
});

const scriptId = (platform: Platform): string => `auto-stash-${platform.id}`;

const originsOfAll = (platforms: Platform[]): string[] =>
    platforms.flatMap(originsOf);

export async function isAutoStashing(platform: Platform): Promise<boolean> {
    const [on, allowed] = await Promise.all([
        onItem.getValue(),
        browser.permissions.contains({ origins: originsOf(platform) }),
    ]);

    return on.includes(platform.id) && allowed;
}

/**
 * Turns these sites on. The browser is asked to allow them, all in one question: call it from a click. Returns
 * false when the person said no. A site that is allowed already is not asked again.
 */
export async function turnOnAutoStash(platforms: Platform[]): Promise<boolean> {
    if (
        !(await browser.permissions.request({
            origins: originsOfAll(platforms),
        }))
    ) {
        return false;
    }

    const on = await onItem.getValue();

    await onItem.setValue([
        ...new Set([...on, ...platforms.map(({ id }) => id)]),
    ]);

    return true;
}

/** Turns these sites off and gives their permission back, as far as the browser lets it be given back. */
export async function turnOffAutoStash(platforms: Platform[]): Promise<void> {
    const ids: string[] = platforms.map(({ id }) => id);

    await onItem.setValue(
        (await onItem.getValue()).filter((id) => !ids.includes(id)),
    );
    // Not an error when it stays: a broader permission covers the site, and the switch is the stored choice.
    await browser.permissions
        .remove({ origins: originsOfAll(platforms) })
        .catch(() => undefined);
}

let running: Promise<unknown> = Promise.resolve();

/**
 * Makes the page scripts match the choices: one is registered for every site that is on and none for a site that
 * is not. Tabs of a site that was just registered get the script now. Runs one after the other, because
 * two registrations of the same script are an error, and the background calls it whenever it starts (a script
 * registered by an older version may be gone after an update).
 */
export function syncAutoStash(): Promise<unknown> {
    running = running.then(sync, sync);

    return running;
}

/** Follows the choices and the permissions, whoever changes them. */
export function watchAutoStash(): void {
    browser.permissions.onAdded.addListener(() => void syncAutoStash());
    browser.permissions.onRemoved.addListener(() => void syncAutoStash());
    onItem.watch(() => void syncAutoStash());
}

async function sync(): Promise<void> {
    const on = await onItem.getValue();
    const registered = new Set(
        (await browser.scripting.getRegisteredContentScripts()).map(
            ({ id }) => id,
        ),
    );

    await Promise.allSettled(
        PLATFORMS.map(async (platform) => {
            const id = scriptId(platform);
            const origins = originsOf(platform);
            const wanted =
                on.includes(platform.id) &&
                (await browser.permissions.contains({ origins }));

            if (!wanted) {
                if (registered.has(id)) {
                    await browser.scripting.unregisterContentScripts({
                        ids: [id],
                    });
                }

                return;
            }

            if (registered.has(id)) {
                return;
            }

            await browser.scripting.registerContentScripts([
                {
                    id,
                    js: ['auto-stash.js'],
                    matches: origins,
                    runAt: 'document_idle',
                    persistAcrossSessions: true,
                },
            ]);

            for (const tab of await browser.tabs.query({ url: origins })) {
                if (tab.id !== undefined) {
                    // Registered and injected both: the script runs once (it marks the page).
                    void browser.scripting
                        .executeScript({
                            target: { tabId: tab.id },
                            files: ['/auto-stash.js'],
                        })
                        .catch(() => undefined);
                }
            }
        }),
    );
}
