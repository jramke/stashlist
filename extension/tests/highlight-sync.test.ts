import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Client } from '../lib/api';
import {
    clearHighlights,
    loadMeta,
    putHighlight,
    readBucket,
    removeHighlight,
} from '../lib/highlights/store';
import { syncHighlights } from '../lib/highlights/sync';
import type { IndexAnswer, StoredHighlight } from '../lib/highlights/types';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function highlight(
    id: number,
    urlHash: string | null = HASH_A,
    revision = 1,
): StoredHighlight {
    return {
        id,
        stashId: 10,
        urlHash,
        text: `passage ${String(id)}`,
        prefix: '',
        suffix: '',
        startOffset: null,
        color: null,
        note: null,
        revision,
    };
}

/** A server that lists some highlights and hands them out by id. */
function server(
    stored: StoredHighlight[],
    etag: string,
): Pick<Client, 'highlightIndex' | 'highlights'> & {
    highlightIndex: ReturnType<typeof vi.fn>;
    highlights: ReturnType<typeof vi.fn>;
} {
    return {
        highlightIndex: vi.fn(
            async (sent: string | null): Promise<IndexAnswer> =>
                sent === etag
                    ? { changed: false }
                    : {
                          changed: true,
                          etag,
                          list: stored.map((item) => ({
                              id: item.id,
                              v: item.revision,
                          })),
                      },
        ),
        highlights: vi.fn(async (ids: number[]) =>
            stored.filter((item) => ids.includes(item.id)),
        ),
    };
}

beforeEach(() => {
    fakeBrowser.reset();
});

describe('syncing highlights', () => {
    it('fetches everything the first time and keeps it per page', async () => {
        const api = server(
            [highlight(1), highlight(2), highlight(3, HASH_B)],
            '"one"',
        );

        expect(await syncHighlights(api as unknown as Client)).toBe(true);

        expect(api.highlightIndex).toHaveBeenCalledWith(null);
        expect(api.highlights).toHaveBeenCalledTimes(1);
        expect(api.highlights).toHaveBeenCalledWith([1, 2, 3]);
        expect((await readBucket(HASH_A)).map((item) => item.id)).toEqual([
            1, 2,
        ]);
        expect((await readBucket(HASH_B)).map((item) => item.id)).toEqual([3]);
        expect((await loadMeta()).etag).toBe('"one"');
    });

    it('asks for nothing when the server says nothing changed', async () => {
        const api = server([highlight(1)], '"one"');

        await syncHighlights(api as unknown as Client);
        api.highlights.mockClear();

        expect(await syncHighlights(api as unknown as Client)).toBe(false);
        expect(api.highlightIndex).toHaveBeenLastCalledWith('"one"');
        expect(api.highlights).not.toHaveBeenCalled();
    });

    it('fetches only what is new or changed, and forgets what is gone', async () => {
        await syncHighlights(
            server(
                [highlight(1), highlight(2), highlight(3, HASH_B)],
                '"one"',
            ) as unknown as Client,
        );

        const next = server(
            [highlight(1), highlight(2, HASH_A, 2), highlight(4, HASH_B)],
            '"two"',
        );

        expect(await syncHighlights(next as unknown as Client)).toBe(true);

        expect(next.highlights).toHaveBeenCalledWith([2, 4]);
        expect(
            (await readBucket(HASH_A)).map((item) => [item.id, item.revision]),
        ).toEqual([
            [1, 1],
            [2, 2],
        ]);
        // Highlight 3 is gone from the server: it leaves its page, and a page with none left is dropped.
        expect((await readBucket(HASH_B)).map((item) => item.id)).toEqual([4]);
        expect(Object.keys((await loadMeta()).entries).sort()).toEqual([
            '1',
            '2',
            '4',
        ]);
    });

    it('asks for at most 200 at a time', async () => {
        const many = Array.from({ length: 450 }, (_, index) =>
            highlight(index + 1, index % 2 === 0 ? HASH_A : HASH_B),
        );
        const api = server(many, '"big"');

        await syncHighlights(api as unknown as Client);

        expect(api.highlights.mock.calls.map(([ids]) => ids.length)).toEqual([
            200, 200, 50,
        ]);
        expect(await readBucket(HASH_A)).toHaveLength(225);
    });

    it('keeps the old copy when a request fails halfway, so the next run starts over', async () => {
        const api = server([highlight(1), highlight(2)], '"one"');
        api.highlights.mockRejectedValueOnce(new Error('offline'));

        await expect(syncHighlights(api as unknown as Client)).rejects.toThrow(
            'offline',
        );
        expect((await loadMeta()).etag).toBeNull();

        expect(await syncHighlights(api as unknown as Client)).toBe(true);
        expect(await readBucket(HASH_A)).toHaveLength(2);
    });
});

describe('the local copy', () => {
    it('moves a highlight to its new page when the stash got another address', async () => {
        await putHighlight(highlight(1, HASH_A));
        await putHighlight(highlight(1, HASH_B, 2));

        expect(await readBucket(HASH_A)).toEqual([]);
        expect((await readBucket(HASH_B)).map((item) => item.revision)).toEqual(
            [2],
        );
    });

    it('keeps a highlight of a stash without an address out of any page', async () => {
        await putHighlight(highlight(1, null));

        expect((await loadMeta()).entries['1']).toEqual({ v: 1, hash: null });
    });

    it('forgets one highlight, and everything', async () => {
        await putHighlight(highlight(1));
        await putHighlight(highlight(2));
        await putHighlight(highlight(3, HASH_B));

        await removeHighlight(1);
        expect((await readBucket(HASH_A)).map((item) => item.id)).toEqual([2]);

        await clearHighlights();
        expect(await readBucket(HASH_A)).toEqual([]);
        expect(await readBucket(HASH_B)).toEqual([]);
        expect(await loadMeta()).toEqual({ etag: null, entries: {} });
    });
});
