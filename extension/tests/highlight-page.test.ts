import { afterEach, describe, expect, it } from 'vitest';
import {
    browserPaintTarget,
    createPainter,
    type PaintTarget,
} from '../lib/highlights/paint';
import {
    describeRange,
    describeSelection,
    MAX_PASSAGE,
} from '../lib/highlights/selection';
import type { StoredHighlight } from '../lib/highlights/types';

class FakeHighlight {
    readonly ranges: Range[];

    constructor(...ranges: Range[]) {
        this.ranges = ranges;
    }
}

/** What the browser keeps for the CSS Custom Highlight API, as a plain map. */
function fakeTarget(): PaintTarget & { registry: Map<string, FakeHighlight> } {
    return {
        registry: new Map<string, FakeHighlight>(),
        Highlight: FakeHighlight,
    };
}

function load(body: string): void {
    document.body.innerHTML = body;
}

function highlight(
    id: number,
    text: string,
    color: string | null = null,
): StoredHighlight {
    return {
        id,
        stashId: 1,
        urlHash: 'a'.repeat(64),
        text,
        prefix: '',
        suffix: '',
        startOffset: null,
        color,
        note: null,
        revision: 1,
    };
}

function painted(
    target: ReturnType<typeof fakeTarget>,
    name: string,
): string[] {
    return (target.registry.get(name)?.ranges ?? []).map((range) =>
        range.toString(),
    );
}

afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
});

describe('painting highlights', () => {
    it('paints every highlight it finds by color and says which ones it found', () => {
        load(
            '<p>Feed it with flour and water.</p><p>Keep it <b>warm</b> overnight.</p><p>Bake at high heat.</p>',
        );
        const target = fakeTarget();

        const found = createPainter(document, target).paint([
            highlight(1, 'flour and water'),
            highlight(2, 'warm overnight', 'green'),
            highlight(3, 'a sentence that is not on the page'),
            highlight(4, 'high heat', 'green'),
        ]);

        expect(found).toEqual([1, 2, 4]);
        expect(painted(target, 'stashlist-yellow')).toEqual([
            'flour and water',
        ]);
        expect(painted(target, 'stashlist-green')).toEqual([
            'warm overnight',
            'high heat',
        ]);
    });

    it('paints a color it does not know in the default color', () => {
        load('<p>Feed it with flour and water.</p>');
        const target = fakeTarget();

        createPainter(document, target).paint([
            highlight(1, 'flour', 'chartreuse'),
        ]);

        expect(painted(target, 'stashlist-yellow')).toEqual(['flour']);
        expect([...target.registry.keys()]).toEqual(['stashlist-yellow']);
    });

    it('replaces what it painted before, so a highlight that was removed disappears', () => {
        load('<p>Feed it with flour and water.</p>');
        const target = fakeTarget();
        const painter = createPainter(document, target);

        painter.paint([highlight(1, 'flour', 'green')]);
        painter.paint([highlight(1, 'water', 'pink')]);

        expect([...target.registry.keys()]).toEqual(['stashlist-pink']);

        painter.clear();

        expect(target.registry.size).toBe(0);
    });

    it('does not touch the page itself, and adds its style once', () => {
        load('<p>Feed it with flour and water.</p>');
        const before = document.body.innerHTML;
        const painter = createPainter(document, fakeTarget());

        painter.paint([highlight(1, 'flour')]);
        painter.paint([highlight(1, 'water')]);

        expect(document.body.innerHTML).toBe(before);
        expect(
            document.querySelectorAll('#stashlist-highlight-style'),
        ).toHaveLength(1);
        expect(
            document.getElementById('stashlist-highlight-style')?.textContent,
        ).toContain('::highlight(stashlist-yellow)');
    });

    it('has nothing to paint with in a browser that lacks the highlight API', () => {
        expect(browserPaintTarget()).toBeNull();
    });
});

describe('describing a selection', () => {
    function rangeOver(text: string): Range {
        const range = document.createRange();
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
        );

        for (
            let node = walker.nextNode();
            node !== null;
            node = walker.nextNode()
        ) {
            const at = (node as Text).data.indexOf(text);

            if (at !== -1) {
                range.setStart(node, at);
                range.setEnd(node, at + text.length);

                return range;
            }
        }

        throw new Error(`"${text}" is not on the page`);
    }

    it('gives the passage with the words around it and where it is', () => {
        load('<p>Feed it with flour and water. Keep it warm overnight.</p>');

        const outcome = describeRange(document, rangeOver('flour and water'));

        expect(outcome).toEqual({
            ok: true,
            passage: {
                text: 'flour and water',
                prefix: 'Feed it with ',
                suffix: '. Keep it warm overnight.',
                startOffset: 13,
            },
        });
    });

    it('describes a selection that runs across elements', () => {
        load('<p>Keep it <b>warm</b> overnight.</p>');
        const range = document.createRange();
        range.setStart(document.querySelector('p')?.firstChild as Text, 5);
        range.setEnd(document.querySelector('p')?.lastChild as Text, 10);

        const outcome = describeRange(document, range);

        expect(outcome.ok && outcome.passage.text).toBe('it warm overnight');
    });

    it('says there is nothing when the selection is empty or only white space', () => {
        load('<p>one</p><p>two</p>');
        const selection = document.getSelection();

        selection?.removeAllRanges();

        expect(describeSelection(document, null)).toEqual({
            ok: false,
            reason: 'nothing',
        });
        expect(describeSelection(document, selection)).toEqual({
            ok: false,
            reason: 'nothing',
        });

        const between = document.createRange();
        between.setStart(document.body.firstChild as Node, 1);
        between.setEnd(document.body.lastChild as Node, 0);

        expect(describeRange(document, between)).toEqual({
            ok: false,
            reason: 'nothing',
        });
    });

    it('refuses a passage longer than the server takes', () => {
        load(`<p>${'word '.repeat(MAX_PASSAGE)}</p>`);
        const range = document.createRange();
        range.selectNodeContents(document.body);

        expect(describeRange(document, range)).toEqual({
            ok: false,
            reason: 'too-long',
        });
    });
});
