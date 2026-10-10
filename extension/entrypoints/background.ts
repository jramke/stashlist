import { explain, needsNewToken, stashTab, stashThing } from '@/lib/stash-tab';
import { browser, type Browser } from 'wxt/browser';

/** The most the API takes as a picture. */
const IMAGE_LIMIT = 20 * 1024 * 1024;

const MENUS: Browser.contextMenus.CreateProperties[] = [
    { id: 'stash-page', title: 'Stash page', contexts: ['page'] },
    { id: 'stash-link', title: 'Stash link', contexts: ['link'] },
    { id: 'stash-image', title: 'Stash image', contexts: ['image'] },
    { id: 'pick-color', title: 'Pick a color…', contexts: ['page', 'action'] },
];

export default defineBackground(() => {
    browser.runtime.onInstalled.addListener(async ({ reason }) => {
        await browser.contextMenus.removeAll();
        MENUS.forEach((menu) => browser.contextMenus.create(menu));

        if (reason === 'install') {
            await browser.runtime.openOptionsPage();
        }
    });

    browser.commands.onCommand.addListener(async (command, tab) => {
        if (command === 'quick_clip' && tab !== undefined) {
            await run(tab.id, () => stashTab(tab));
        }
    });

    browser.contextMenus.onClicked.addListener(async (info, tab) => {
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
                if (info.srcUrl !== undefined && tab !== undefined)
                    await stashImage(tab, info.srcUrl);
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
    });
});

/** Runs a save and tells the person how it went on the toolbar icon: a tick, or a cross with the reason. */
async function run(
    tabId: number | undefined,
    save: () => Promise<{ created: boolean; title: string }>,
): Promise<void> {
    try {
        const result = await save();

        await flash(
            tabId,
            result.created ? '✓' : '=',
            '#16a34a',
            result.created
                ? `Stashed: ${result.title}`
                : `Already stashed: ${result.title}`,
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
    }, 3000);
}

/**
 * The image the person sees, as bytes: fetched by the page itself, so a login or cookies the page has still
 * count. When that fails (another site's picture without CORS) the address is saved and the server fetches it.
 */
async function stashImage(tab: Browser.tabs.Tab, src: string): Promise<void> {
    await run(tab.id, async () => {
        const bytes =
            tab.id === undefined
                ? null
                : await fetchInPage(tab.id, src, IMAGE_LIMIT);

        return stashThing(
            bytes === null
                ? { type: 'image', url: src }
                : { type: 'image', image: bytes },
        );
    });
}

async function fetchInPage(
    tabId: number,
    src: string,
    limit: number,
): Promise<Blob | null> {
    try {
        const [injection] = await browser.scripting.executeScript({
            target: { tabId },
            args: [src, limit],
            func: async (
                address: string,
                max: number,
            ): Promise<string | null> => {
                const response = await fetch(address, {
                    credentials: 'include',
                });
                const blob = await response.blob();

                if (
                    !response.ok ||
                    blob.size === 0 ||
                    (max > 0 && blob.size > max)
                ) {
                    return null;
                }

                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(blob);
                });
            },
        });
        const dataUrl = injection?.result;

        return typeof dataUrl === 'string'
            ? await (await fetch(dataUrl)).blob()
            : null;
    } catch {
        return null;
    }
}
