import { browser } from 'wxt/browser';
import { originsOf, type Platform } from './platforms';

const scriptId = (platform: Platform): string => `auto-stash-${platform.id}`;

/** Whether the page script is on for a site: registered, and the browser still lets it run there. */
export async function isAutoStashing(platform: Platform): Promise<boolean> {
    const [registered, allowed] = await Promise.all([
        browser.scripting.getRegisteredContentScripts({
            ids: [scriptId(platform)],
        }),
        browser.permissions.contains({ origins: originsOf(platform) }),
    ]);

    return registered.length > 0 && allowed;
}

/**
 * Turns it on for a site. The browser asks the person to allow that one site, so call this from a click; it
 * returns false when they said no. Tabs of the site that are open already get the script now.
 */
export async function turnOnAutoStash(platform: Platform): Promise<boolean> {
    const origins = originsOf(platform);

    if (!(await browser.permissions.request({ origins }))) {
        return false;
    }

    if (
        (
            await browser.scripting.getRegisteredContentScripts({
                ids: [scriptId(platform)],
            })
        ).length === 0
    ) {
        await browser.scripting.registerContentScripts([
            {
                id: scriptId(platform),
                js: ['auto-stash.js'],
                matches: origins,
                runAt: 'document_idle',
                persistAcrossSessions: true,
            },
        ]);
    }

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

    return true;
}

/** Turns it off for a site and gives the permission back. */
export async function turnOffAutoStash(platform: Platform): Promise<void> {
    if (
        (
            await browser.scripting.getRegisteredContentScripts({
                ids: [scriptId(platform)],
            })
        ).length > 0
    ) {
        await browser.scripting.unregisterContentScripts({
            ids: [scriptId(platform)],
        });
    }

    await browser.permissions.remove({ origins: originsOf(platform) });
}
