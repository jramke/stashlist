import { highlightSelection } from '@/lib/highlights/create';
import { syncHighlights } from '@/lib/highlights/sync';
import { isBadgeOn, isSaved, syncSaved } from '@/lib/saved';
import { stashImage } from '@/lib/stash-image';
import {
    connect,
    explain,
    needsNewToken,
    stashTab,
    stashThing,
} from '@/lib/stash-tab';
import { browser, type Browser } from 'wxt/browser';

/** The local copy of the highlights is brought up to date this often; it is one small request. */
const SYNC_ALARM = 'sync-highlights';
const SYNC_MINUTES = 30;

const MENUS: Browser.contextMenus.CreateProperties[] = [
    { id: 'stash-page', title: 'Stash page', contexts: ['page'] },
    { id: 'stash-link', title: 'Stash link', contexts: ['link'] },
    { id: 'stash-image', title: 'Stash image', contexts: ['image'] },
    {
        id: 'highlight-selection',
        title: 'Highlight selection',
        contexts: ['selection'],
    },
    { id: 'pick-color', title: 'Stash color…', contexts: ['page', 'action'] },
];

export default defineBackground(() => {
    browser.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === SYNC_ALARM) void syncQuietly();
    });
    browser.runtime.onStartup.addListener(() => void syncQuietly());
    void ensureSyncAlarm();

    // The check on the icon for a page that is saved already (only with the optional `tabs` permission).
    browser.tabs.onUpdated.addListener((tabId, change, tab) => {
        if (change.status === 'complete' || change.url !== undefined) {
            void markIfSaved(tabId, tab.url);
        }
    });
    browser.tabs.onActivated.addListener(({ tabId }) => {
        void browser.tabs
            .get(tabId)
            .then((tab) => markIfSaved(tabId, tab.url))
            .catch(() => undefined);
    });

    browser.runtime.onInstalled.addListener(async ({ reason }) => {
        await browser.contextMenus.removeAll();
        MENUS.forEach((menu) => browser.contextMenus.create(menu));

        if (reason === 'install') {
            await browser.runtime.openOptionsPage();
        }

        void syncQuietly();
    });

    browser.commands.onCommand.addListener(async (command, tab) => {
        if (command === 'quick_clip' && tab !== undefined) {
            await run(tab.id, () => stashTab(tab));
        }

        if (command === 'highlight_selection' && tab !== undefined) {
            await highlight(tab);
        }
    });

    browser.contextMenus.onClicked.addListener(onMenuClick);

    // The browser flows cannot click the browser's own menu: the end-to-end build lets them call the same handler.
    if (import.meta.env.MODE === 'e2e') {
        Object.assign(globalThis, { stashlistMenu: onMenuClick });
    }
});

async function onMenuClick(
    info: Browser.contextMenus.OnClickData,
    tab: Browser.tabs.Tab | undefined,
): Promise<void> {
    switch (info.menuItemId) {
        case 'stash-page':
            if (tab !== undefined) await run(tab.id, () => stashTab(tab));
            break;
        case 'stash-link':
            if (info.linkUrl !== undefined) {
                const url = info.linkUrl;
                await run(tab?.id, () => stashThing({ type: 'link', url }));
            }
            break;
        case 'stash-image':
            if (info.srcUrl !== undefined && tab !== undefined) {
                const click = { srcUrl: info.srcUrl, frameId: info.frameId };
                await run(tab.id, async () => {
                    const { result, page } = await stashImage(tab, click);

                    // Said on the icon, so a person sees which of the two they got.
                    return page ? result : { ...result, words: IMAGE_WORDS };
                });
            }
            break;
        case 'highlight-selection':
            if (tab !== undefined) await highlight(tab);
            break;
        case 'pick-color':
            await browser.windows.create({
                url: browser.runtime.getURL('/picker.html'),
                type: 'popup',
                width: 340,
                height: 260,
            });
            break;
    }
}

async function ensureSyncAlarm(): Promise<void> {
    if ((await browser.alarms.get(SYNC_ALARM)) === undefined) {
        await browser.alarms.create(SYNC_ALARM, {
            delayInMinutes: 1,
            periodInMinutes: SYNC_MINUTES,
        });
    }
}

/** A sync nobody is waiting for: offline or a token that is not set up yet is not worth a message. */
async function syncQuietly(): Promise<void> {
    try {
        const { client } = await connect();

        await syncHighlights(client);

        if (await isBadgeOn()) {
            await syncSaved(client);
        }
    } catch {
        // The next alarm tries again.
    }
}

/** A check on the icon of a tab whose page is saved, nothing on any other. */
async function markIfSaved(
    tabId: number,
    url: string | undefined,
): Promise<void> {
    if (url === undefined || !(await isBadgeOn())) {
        return;
    }

    const saved = await isSaved(url);

    await browser.action.setBadgeBackgroundColor({ color: '#16a34a', tabId });
    await browser.action.setBadgeText({ text: saved ? '✓' : '', tabId });
    await browser.action.setTitle({
        title: saved ? 'Stashlist: already stashed' : 'Stashlist',
        tabId,
    });
}

async function highlight(tab: Browser.tabs.Tab): Promise<void> {
    await run(
        tab.id,
        async () => {
            const { created, highlight } = await highlightSelection(tab);

            return { created, title: highlight.text };
        },
        { created: 'Highlighted', existing: 'Already highlighted' },
    );
}

type Words = { created: string; existing: string };

const PAGE_WORDS: Words = { created: 'Stashed', existing: 'Already stashed' };

/** A picture that was stashed as itself says so, where a page stashed with its picture says what a page says. */
const IMAGE_WORDS: Words = {
    created: 'Stashed image',
    existing: 'Already stashed image',
};

/**
 * Runs a save and tells the person how it went on the toolbar icon: a tick, or a cross with the reason. A save
 * may bring its own words for what it stashed.
 */
async function run(
    tabId: number | undefined,
    save: () => Promise<{ created: boolean; title: string; words?: Words }>,
    defaultWords = PAGE_WORDS,
): Promise<void> {
    try {
        const result = await save();
        const words = result.words ?? defaultWords;

        await flash(
            tabId,
            result.created ? '✓' : '=',
            '#16a34a',
            result.created
                ? `${words.created}: ${result.title}`
                : `${words.existing}: ${result.title}`,
        );
    } catch (error) {
        await flash(tabId, '✕', '#dc2626', explain(error));

        if (needsNewToken(error)) {
            await browser.runtime.openOptionsPage();
        }
    }
}

async function flash(
    tabId: number | undefined,
    text: string,
    color: string,
    title: string,
): Promise<void> {
    const target = tabId === undefined ? {} : { tabId };

    await browser.action.setBadgeBackgroundColor({ color, ...target });
    await browser.action.setBadgeText({ text, ...target });
    await browser.action.setTitle({ title, ...target });

    setTimeout(() => {
        void browser.action.setBadgeText({ text: '', ...target });
        void browser.action.setTitle({ title: 'Stashlist', ...target });

        if (tabId !== undefined) {
            void browser.tabs
                .get(tabId)
                .then((tab) => markIfSaved(tabId, tab.url))
                .catch(() => undefined);
        }
    }, 3000);
}
