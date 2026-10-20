import { browser } from 'wxt/browser';
import { originsOf, PLATFORMS, type Platform } from './platforms';

/**
 * "Stash when I save" is on for a site exactly when the browser lets the extension see that site. The options page
 * asks for the permission or gives it back, and the background (`watchAutoStash`) makes the page scripts follow, so
 * the switch cannot disagree with the browser, also when the permission is taken away from the browser's own page.
 */

const scriptId = (platform: Platform): string => `auto-stash-${platform.id}`;

const originsOfAll = (platforms: Platform[]): string[] =>
    platforms.flatMap(originsOf);

export async function isAutoStashing(platform: Platform): Promise<boolean> {
    return browser.permissions.contains({ origins: originsOf(platform) });
}

/**
 * Asks the browser to allow these sites, all in one question. Call it from a click; it returns false when the
 * person said no. A site that is allowed already is not asked again.
 */
export async function turnOnAutoStash(platforms: Platform[]): Promise<boolean> {
    return browser.permissions.request({ origins: originsOfAll(platforms) });
}

/**
 * Gives the permission for these sites back. Giving back "every site" (the highlights' switch) takes them with it,
 * which the background sees as well.
 */
export async function turnOffAutoStash(platforms: Platform[]): Promise<void> {
    await browser.permissions.remove({ origins: originsOfAll(platforms) });
}

let running: Promise<unknown> = Promise.resolve();

/**
 * Makes the page scripts match the permissions: one is registered for every site that is allowed and none for a
 * site that is not. Tabs of a site that was just registered get the script now. Runs one after the other, because
 * two registrations of the same script are an error, and the background calls it whenever it starts (a script
 * registered by an older version may be gone after an update).
 */
export function syncAutoStash(): Promise<unknown> {
    running = running.then(sync, sync);

    return running;
}

/** Follows the permissions, whoever changes them. */
export function watchAutoStash(): void {
    browser.permissions.onAdded.addListener(() => void syncAutoStash());
    browser.permissions.onRemoved.addListener(() => void syncAutoStash());
}

async function sync(): Promise<void> {
    const registered = new Set(
        (await browser.scripting.getRegisteredContentScripts()).map(
            ({ id }) => id,
        ),
    );

    await Promise.allSettled(
        PLATFORMS.map(async (platform) => {
            const id = scriptId(platform);
            const origins = originsOf(platform);
            const allowed = await browser.permissions.contains({ origins });

            if (!allowed) {
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
