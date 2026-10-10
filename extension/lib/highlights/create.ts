import { browser } from 'wxt/browser';
import { isStashable } from '../page';
import { connect, NotHighlightable, NotStashable } from '../stash-tab';
import type { SelectionOutcome } from './selection';
import { putHighlight } from './store';
import type { StoredHighlight } from './types';

type Read = { url: string; title: string; outcome: SelectionOutcome };

/**
 * Marks the text selected in a tab: reads the selection in the page, sends it (the server saves the page first
 * when it is not stashed yet), keeps the answer in the local copy and shows it in the page at once.
 *
 * Needs the permission the person just gave by clicking, pressing the shortcut or using the menu (activeTab).
 */
export async function highlightSelection(tab: {
    id?: number | undefined;
    url?: string | undefined;
}): Promise<{ created: boolean; highlight: StoredHighlight }> {
    const { client } = await connect();

    if (tab.id === undefined || !isStashable(tab.url)) {
        throw new NotStashable();
    }

    const [injection] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['/selection.js'],
    });
    const read = injection?.result as Read | undefined;

    if (read === undefined || read === null || !read.outcome.ok) {
        throw new NotHighlightable(
            read?.outcome.ok === false ? read.outcome.reason : 'nothing',
        );
    }

    const result = await client.createHighlight({
        url: read.url,
        title: read.title,
        ...read.outcome.passage,
    });

    await putHighlight(result.highlight);
    await showOnTab(tab.id);

    return result;
}

/** Puts the page script into a tab so its highlights show without waiting for a reload. */
export async function showOnTab(tabId: number): Promise<void> {
    try {
        await browser.scripting.executeScript({
            target: { tabId },
            files: ['/highlighter.js'],
        });
    } catch {
        // The page went away or cannot be scripted; the highlight is saved all the same.
    }
}
