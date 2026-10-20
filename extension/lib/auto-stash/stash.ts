import { isStashable } from '../page';
import { stashThing, version } from '../stash-tab';
import type { SaveRequest, SaveResult } from '../types';
import { AUTO_STASH, type SavedItem } from './platforms';

const MAX_URL = 2048;
const MAX_TITLE = 300;
const MAX_TEXT = 20_000;

/**
 * What the page script sent, checked again here because it came from a page: null for anything else. The
 * server cleans every string as well; this keeps the request inside its caps.
 */
export function readSavedItem(message: unknown): SavedItem | null {
    if (typeof message !== 'object' || message === null) {
        return null;
    }

    const { type, item } = message as { type?: unknown; item?: unknown };

    if (type !== AUTO_STASH || typeof item !== 'object' || item === null) {
        return null;
    }

    const { url, title, text, imageUrl } = item as Record<string, unknown>;

    if (typeof url !== 'string' || url.length > MAX_URL || !isStashable(url)) {
        return null;
    }

    const read: SavedItem = { url };

    if (typeof title === 'string' && title.trim() !== '') {
        read.title = title.slice(0, MAX_TITLE);
    }

    if (typeof text === 'string' && text.trim() !== '') {
        read.text = text.slice(0, MAX_TEXT);
    }

    if (
        typeof imageUrl === 'string' &&
        imageUrl.length <= MAX_URL &&
        isStashable(imageUrl)
    ) {
        read.imageUrl = imageUrl;
    }

    return read;
}

/**
 * Stashes what the person saved with their defaults. With `text` the server reads nothing itself (it would find
 * a login wall), without it the server fetches the page as it does for a link.
 */
export async function stashSaved(item: SavedItem): Promise<SaveResult> {
    const request: SaveRequest = { type: 'link', url: item.url };

    if (item.title !== undefined) {
        request.title = item.title;
    }

    if (item.text !== undefined || item.imageUrl !== undefined) {
        request.capture = {
            source: 'extension',
            version: version(),
            ...(item.text === undefined ? {} : { content_markdown: item.text }),
            ...(item.imageUrl === undefined
                ? {}
                : { image_url: item.imageUrl }),
        };
    }

    return stashThing(request);
}
