import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { PaintTarget } from '../lib/highlights/paint';
import { showHighlights } from '../lib/highlights/show';
import { putHighlight, removeHighlight } from '../lib/highlights/store';
import type { StoredHighlight } from '../lib/highlights/types';
import { normalizeUrl, urlHash } from '../lib/normalize-url';

const HREF = 'https://bakeclub.example/posts/starter?utm_source=newsletter#top';

class FakeHighlight {
    readonly ranges: Range[];

    constructor(...ranges: Range[]) {
        this.ranges = ranges;
    }
}

const registry = new Map<string, FakeHighlight>();
const target: PaintTarget = { registry, Highlight: FakeHighlight };

async function highlight(id: number, text: string): Promise<StoredHighlight> {
    return {
        id,
        stashId: 1,
        // The server hashes the normalized address: tracking parameters and the fragment are not part of it.
        urlHash: await urlHash(normalizeUrl(HREF) ?? ''),
        text,
        prefix: '',
        suffix: '',
        startOffset: null,
        color: null,
        note: null,
        revision: 1,
    };
}

function painted(): string[] {
    return (registry.get('stashlist-yellow')?.ranges ?? []).map((range) =>
        range.toString(),
    );
}

beforeEach(() => {
    fakeBrowser.reset();
    registry.clear();
    document.head.innerHTML = '';
    document.body.innerHTML =
        '<p>Feed it with flour and water.</p><p>Keep it warm overnight.</p>';
});

describe('showing highlights on a page', () => {
    it('paints what is kept for the page, by the hash of its address', async () => {
        await putHighlight(await highlight(1, 'flour and water'));

        const stop = await showHighlights({ document, href: HREF, target });

        expect(painted()).toEqual(['flour and water']);

        stop();
    });

    it('paints nothing for a page it has no highlights for', async () => {
        await putHighlight(await highlight(1, 'flour and water'));

        const stop = await showHighlights({
            document,
            href: 'https://bakeclub.example/posts/other',
            target,
        });

        expect(registry.size).toBe(0);

        stop();
    });

    it('follows the local copy: a new highlight appears and a deleted one goes', async () => {
        const stop = await showHighlights({ document, href: HREF, target });

        expect(registry.size).toBe(0);

        await putHighlight(await highlight(1, 'warm overnight'));
        await vi.waitFor(() => expect(painted()).toEqual(['warm overnight']));

        await removeHighlight(1);
        await vi.waitFor(() => expect(registry.size).toBe(0));

        stop();
    });

    it('paints again when the page changes under it, after it settles', async () => {
        await putHighlight(await highlight(1, 'warm overnight'));
        document.body.innerHTML = '<p>Loading…</p>';

        const stop = await showHighlights({ document, href: HREF, target });

        expect(registry.size).toBe(0);

        document.body.innerHTML = '<p>Keep it warm overnight.</p>';
        await vi.waitFor(() => expect(painted()).toEqual(['warm overnight']), {
            timeout: 3000,
        });

        stop();
    });

    it('removes its paint when stopped, and does nothing for an address that is not a page', async () => {
        await putHighlight(await highlight(1, 'warm overnight'));

        const stop = await showHighlights({ document, href: HREF, target });
        stop();

        expect(registry.size).toBe(0);

        const none = await showHighlights({
            document,
            href: 'about:blank',
            target,
        });
        none();

        expect(registry.size).toBe(0);
    });
});
