import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import type { Client } from './api';
import { normalizeUrl, urlHash } from './normalize-url';

/**
 * "Already saved" for the toolbar icon. The extension keeps the hashes of the person's saved addresses (the
 * server lists them, a 304 when nothing changed) and looks a page up in that list, so the address of a page the
 * person visits never reaches the server. Reading the address of every tab needs the optional `tabs`
 * permission; without it nothing here runs.
 */

type SavedCopy = { etag: string | null; hashes: string[] };

const KEY = 'local:saved';
const PERMISSION = { permissions: ['tabs' as const] };

export async function isBadgeOn(): Promise<boolean> {
    return browser.permissions.contains(PERMISSION);
}

/** Asks for the permission; call it from a click. Returns false when the person said no. */
export async function turnOnBadge(): Promise<boolean> {
    return browser.permissions.request(PERMISSION);
}

export async function turnOffBadge(): Promise<void> {
    await browser.permissions.remove(PERMISSION);
    await storage.removeItem(KEY);
}

async function load(): Promise<SavedCopy> {
    return (
        (await storage.getItem<SavedCopy>(KEY)) ?? { etag: null, hashes: [] }
    );
}

/** Brings the local list up to date: one request, usually answered "no change". */
export async function syncSaved(client: Client): Promise<void> {
    const copy = await load();
    const answer = await client.savedHashes(copy.etag);

    if (answer.changed) {
        await storage.setItem<SavedCopy>(KEY, {
            etag: answer.etag,
            hashes: answer.hashes,
        });
    }
}

/** What the person just saved, known at once instead of at the next sync. */
export async function rememberSaved(url: string | null): Promise<void> {
    const normalized = url === null ? null : normalizeUrl(url);

    if (normalized === null || !(await isBadgeOn())) {
        return;
    }

    const hash = await urlHash(normalized);
    const copy = await load();

    if (!copy.hashes.includes(hash)) {
        // The ETag no longer matches this list, so the next sync fetches the server's own.
        await storage.setItem<SavedCopy>(KEY, {
            etag: null,
            hashes: [...copy.hashes, hash],
        });
    }
}

export async function isSaved(url: string): Promise<boolean> {
    const normalized = normalizeUrl(url);

    return (
        normalized !== null &&
        (await load()).hashes.includes(await urlHash(normalized))
    );
}
