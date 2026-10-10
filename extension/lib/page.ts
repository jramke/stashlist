import { browser } from 'wxt/browser';
import type { PageCapture } from './types';

/** Pages the browser keeps to itself or that are not on the web. */
export function isStashable(url: string | undefined): url is string {
    return url !== undefined && /^https?:\/\//i.test(url);
}

/**
 * Reads the page in the tab: runs the capture script in it (allowed by activeTab, because the person just
 * clicked, pressed the shortcut or used the menu). When the page cannot be scripted, for example the browser's
 * own store, what the tab itself knows is enough to save a bare link.
 */
export async function capturePage(tab: {
    id?: number | undefined;
    url?: string | undefined;
    title?: string | undefined;
}): Promise<PageCapture> {
    const url = tab.url ?? '';

    if (tab.id !== undefined) {
        try {
            const [injection] = await browser.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['/capture.js'],
            });
            const result = injection?.result as PageCapture | undefined;

            if (result !== undefined && result !== null) {
                return result;
            }
        } catch {
            // Fall through to the bare link.
        }
    }

    return {
        url,
        title: tab.title ?? url,
        description: null,
        siteName: null,
        author: null,
        published: null,
        language: null,
        faviconUrl: null,
        imageUrl: null,
        contentMarkdown: null,
        schemaOrg: [],
    };
}
