import { storage } from 'wxt/utils/storage';
import { normalizeUrl, urlHash } from '../normalize-url';
import { createPainter, type PaintTarget } from './paint';
import { bucketKey, readBucket } from './store';
import type { StoredHighlight } from './types';

/** A page that changes all the time is painted again at most this often. */
const SETTLE_MS = 1000;

/**
 * Paints the highlights of a page and keeps them right while the page lives: when the local copy changes (a
 * highlight was made here, edited or deleted elsewhere and synced) and when the page's own text changes.
 *
 * The address is hashed here and looked up in extension storage; it is never sent anywhere.
 *
 * @returns a function that stops watching and removes the paint
 */
export async function showHighlights(page: {
    document: Document;
    href: string;
    target: PaintTarget;
}): Promise<() => void> {
    const normalized = normalizeUrl(page.href);

    if (normalized === null) {
        return () => undefined;
    }

    const hash = await urlHash(normalized);
    const painter = createPainter(page.document, page.target);
    const observer = new MutationObserver(() => schedule());
    let timer: ReturnType<typeof setTimeout> | undefined;
    let watching = false;

    const paintNow = async (): Promise<void> => {
        const highlights: StoredHighlight[] = await readBucket(hash);

        painter.paint(highlights);

        // Only a page with highlights is worth watching.
        if (highlights.length > 0 && !watching) {
            observer.observe(page.document.body, {
                childList: true,
                characterData: true,
                subtree: true,
            });
            watching = true;
        } else if (highlights.length === 0 && watching) {
            observer.disconnect();
            watching = false;
        }
    };

    function schedule(): void {
        clearTimeout(timer);
        timer = setTimeout(() => void paintNow(), SETTLE_MS);
    }

    const unwatch = storage.watch(bucketKey(hash), () => void paintNow());

    await paintNow();

    return () => {
        unwatch();
        observer.disconnect();
        clearTimeout(timer);
        painter.clear();
    };
}
