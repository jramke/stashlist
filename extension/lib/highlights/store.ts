import { storage } from 'wxt/utils/storage';
import { normalizeUrl, urlHash } from '../normalize-url';
import type { StoredHighlight } from './types';

/**
 * The local copy of the person's highlights, kept in extension storage so a page can be looked at without a
 * request: the page's address is hashed and the highlights of that hash are read. Nothing about a visit ever
 * reaches the server.
 *
 * One key per page hash holds that page's highlights, so a page load reads only what it needs. One more key
 * holds what sync needs: the ETag of the server's list and, for every highlight, its revision and page.
 */

export type IndexMeta = {
    etag: string | null;
    entries: Record<string, { v: number; hash: string | null }>;
};

const META_KEY = 'local:highlight-meta';

export function bucketKey(hash: string): `local:highlights:${string}` {
    return `local:highlights:${hash}`;
}

export async function loadMeta(): Promise<IndexMeta> {
    return (
        (await storage.getItem<IndexMeta>(META_KEY)) ?? {
            etag: null,
            entries: {},
        }
    );
}

export async function saveMeta(meta: IndexMeta): Promise<void> {
    await storage.setItem(META_KEY, meta);
}

export async function readBucket(hash: string): Promise<StoredHighlight[]> {
    return (await storage.getItem<StoredHighlight[]>(bucketKey(hash))) ?? [];
}

/** The highlights kept for a page, found by the hash of its normalized address. */
export async function highlightsOfPage(
    url: string,
): Promise<StoredHighlight[]> {
    const normalized = normalizeUrl(url);

    return normalized === null ? [] : readBucket(await urlHash(normalized));
}

async function writeBucket(
    hash: string,
    highlights: StoredHighlight[],
): Promise<void> {
    if (highlights.length === 0) {
        await storage.removeItem(bucketKey(hash));
    } else {
        await storage.setItem(bucketKey(hash), highlights);
    }
}

/** Keeps a highlight, new or changed, in the local copy. */
export async function putHighlight(
    highlight: StoredHighlight,
    meta?: IndexMeta,
): Promise<void> {
    const index = meta ?? (await loadMeta());
    const previous = index.entries[highlight.id];

    // A highlight whose page changed (the stash got another address) leaves its old bucket.
    if (
        previous?.hash !== undefined &&
        previous.hash !== null &&
        previous.hash !== highlight.urlHash
    ) {
        await writeBucket(
            previous.hash,
            (await readBucket(previous.hash)).filter(
                (other) => other.id !== highlight.id,
            ),
        );
    }

    if (highlight.urlHash !== null) {
        const bucket = (await readBucket(highlight.urlHash)).filter(
            (other) => other.id !== highlight.id,
        );
        await writeBucket(highlight.urlHash, [...bucket, highlight]);
    }

    index.entries[highlight.id] = {
        v: highlight.revision,
        hash: highlight.urlHash,
    };

    if (meta === undefined) {
        await saveMeta(index);
    }
}

/** Forgets a highlight (the person deleted it, or the server no longer lists it). */
export async function removeHighlight(
    id: number,
    meta?: IndexMeta,
): Promise<void> {
    const index = meta ?? (await loadMeta());
    const entry = index.entries[id];

    if (entry?.hash !== undefined && entry.hash !== null) {
        await writeBucket(
            entry.hash,
            (await readBucket(entry.hash)).filter((other) => other.id !== id),
        );
    }

    delete index.entries[id];

    if (meta === undefined) {
        await saveMeta(index);
    }
}

/** Forgets everything: another account or another server must not see the previous person's highlights. */
export async function clearHighlights(): Promise<void> {
    const meta = await loadMeta();
    const hashes = new Set(
        Object.values(meta.entries).map((entry) => entry.hash),
    );

    for (const hash of hashes) {
        if (hash !== null) {
            await storage.removeItem(bucketKey(hash));
        }
    }

    await storage.removeItem(META_KEY);
}
