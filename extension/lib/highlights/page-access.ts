import { browser } from 'wxt/browser';

const SCRIPT_ID = 'highlighter';
const ORIGINS = ['https://*/*', 'http://*/*'];

/** Whether highlights are shown on every page without a click. */
export async function isShowingOnPages(): Promise<boolean> {
    const registered = await browser.scripting.getRegisteredContentScripts({
        ids: [SCRIPT_ID],
    });

    return registered.length > 0;
}

/**
 * Turns on showing highlights on every page. This needs the permission to read all sites, which the browser
 * asks the person for; call it from a click. Returns false when they said no.
 */
export async function showOnPages(): Promise<boolean> {
    if (!(await browser.permissions.request({ origins: ORIGINS }))) {
        return false;
    }

    if (!(await isShowingOnPages())) {
        await browser.scripting.registerContentScripts([
            {
                id: SCRIPT_ID,
                js: ['highlighter.js'],
                matches: ORIGINS,
                runAt: 'document_idle',
                persistAcrossSessions: true,
            },
        ]);
    }

    return true;
}

/**
 * Turns it off and gives the permission back. Highlights still show in a tab where one was just made.
 *
 * Giving back "every site" can take the access to a self-hosted Stashlist with it, because that is one of
 * them: the caller checks that again afterwards.
 */
export async function hideOnPages(): Promise<void> {
    if (await isShowingOnPages()) {
        await browser.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
    }

    await browser.permissions.remove({ origins: ORIGINS });
}
