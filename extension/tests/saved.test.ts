import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Client } from '../lib/api';
import { normalizeUrl, urlHash } from '../lib/normalize-url';
import { isSaved, rememberSaved, syncSaved } from '../lib/saved';

// The fake browser has no permissions; this one says whether `tabs` was granted.
let granted = false;

beforeEach(() => {
    fakeBrowser.reset();
    granted = false;
    fakeBrowser.permissions.contains = vi.fn(async () => granted);
});

async function hashOf(url: string): Promise<string> {
    return urlHash(normalizeUrl(url) ?? '');
}

function server(hashes: string[], etag: string) {
    return {
        savedHashes: vi.fn(async (sent: string | null) =>
            sent === etag
                ? { changed: false as const }
                : { changed: true as const, etag, hashes },
        ),
    } as unknown as Client & { savedHashes: ReturnType<typeof vi.fn> };
}

describe('saved pages', () => {
    it('knows a page from the list, however its address is written', async () => {
        const client = server([await hashOf('https://example.com/a')], 'e1');

        await syncSaved(client);

        expect(await isSaved('https://EXAMPLE.com/a?utm_source=x#top')).toBe(
            true,
        );
        expect(await isSaved('https://example.com/b')).toBe(false);
    });

    it('asks again with the ETag and keeps the list when nothing changed', async () => {
        const client = server([await hashOf('https://example.com/a')], 'e1');

        await syncSaved(client);
        await syncSaved(client);

        expect(client.savedHashes).toHaveBeenLastCalledWith('e1');
        expect(await isSaved('https://example.com/a')).toBe(true);
    });

    it('remembers a save at once only while the permission is on', async () => {
        await rememberSaved('https://example.com/new');
        expect(await isSaved('https://example.com/new')).toBe(false);

        granted = true;
        await rememberSaved('https://example.com/new');
        expect(await isSaved('https://example.com/new')).toBe(true);
    });
});
