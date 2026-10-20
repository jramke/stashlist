import {
    AUTO_STASH,
    platformForHost,
    watchSaves,
} from '@/lib/auto-stash/platforms';
import { browser } from 'wxt/browser';

const STARTED = '__stashlistAutoStash';

// Not in the manifest: it is registered as a content script for one site when the person turns on "Stash when I
// save" for it (and allows that site), and injected into the tabs of the site that are open at that moment.
export default defineUnlistedScript(() => {
    const platform = platformForHost(location.hostname);
    const scope = globalThis as unknown as Record<string, unknown>;

    // Registered and injected both: the first one runs.
    if (platform === null || scope[STARTED] === true) {
        return;
    }

    scope[STARTED] = true;
    watchSaves(document, platform, (item) => {
        // An extension that was updated or removed under an open page cannot be reached any more.
        void Promise.resolve(
            browser.runtime.sendMessage({ type: AUTO_STASH, item }),
        ).catch(() => undefined);
    });
});
