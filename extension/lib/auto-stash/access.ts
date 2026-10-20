import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import { originsOf, PLATFORMS, type Platform } from './platforms';

/** The sites the person turned off. Every other site is on: the extension has the right to see them from the install. */
const offItem = storage.defineItem<string[]>('sync:auto-stash-off', {
    fallback: [],
});

const scriptId = (platform: Platform): string => `auto-stash-${platform.id}`;

export async function isAutoStashing(platform: Platform): Promise<boolean> {
    return !(await offItem.getValue()).includes(platform.id);
}

/** Only writes the choice; the background (`watchAutoStash`) makes the scripts follow it. */
export async function setAutoStash(
    platform: Platform,
    on: boolean,
): Promise<void> {
    const off = (await offItem.getValue()).filter((id) => id !== platform.id);

    await offItem.setValue(on ? off : [...off, platform.id]);
}

let running: Promise<unknown> = Promise.resolve();

/**
 * Makes the page scripts match the choices: one is registered for every site that is on and none for a site that
 * is off. Tabs of a site that was just registered get the script now. Runs one after the other, because two
 * registrations of the same script are an error, and the background calls it whenever it starts.
 */
export function syncAutoStash(): Promise<unknown> {
    running = running.then(sync, sync);

    return running;
}

/** Follows a change of the choices, also one made on another device of the same browser account. */
export function watchAutoStash(): void {
    offItem.watch(() => void syncAutoStash());
}

async function sync(): Promise<void> {
    const off = await offItem.getValue();
    const registered = new Set(
        (await browser.scripting.getRegisteredContentScripts()).map(
            ({ id }) => id,
        ),
    );

    await Promise.allSettled(
        PLATFORMS.map(async (platform) => {
            const id = scriptId(platform);
            const origins = originsOf(platform);

            if (off.includes(platform.id)) {
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
