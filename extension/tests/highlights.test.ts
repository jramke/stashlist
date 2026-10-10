import { describe, expect, it } from 'vitest';
import { anchor, quoteOf, type Quote } from '../lib/highlights/anchor';
import { buildPageText } from '../lib/highlights/page-text';

/**
 * Puts a page in the document of the test. Ranges only work on that document in the test environment, so every
 * page replaces the one before; take what is needed from a page before loading the next.
 */
function page(body: string): Document {
    document.body.innerHTML = body;

    return document;
}

/** The passage at a place of the page as it is now in the document. */
function textAt(found: { start: number; end: number } | null): string | null {
    const model = buildPageText(document.body);
    const range = found === null ? null : model.locate(found.start, found.end);

    return range === null ? null : range.toString().replace(/\s+/g, ' ');
}

const ARTICLE = `
    <article>
        <h1>Sourdough starters</h1>
        <p>A sourdough starter is a <b>living culture</b> of wild yeast and bacteria that you keep alive.</p>
        <p>Feed it with flour and water. A living culture needs care, and a living culture rewards it.</p>
        <script>var secret = 'not part of the page text';</script>
        <style>p { color: red }</style>
    </article>`;

describe('the text of a page', () => {
    it('is what a person reads: white space collapsed, a space between blocks, no scripts or styles', () => {
        const { text } = buildPageText(page(ARTICLE).body);

        expect(text).toBe(
            'Sourdough starters A sourdough starter is a living culture of wild yeast and bacteria that you keep alive. ' +
                'Feed it with flour and water. A living culture needs care, and a living culture rewards it.',
        );
        expect(text).not.toContain('secret');
        expect(text).not.toContain('color: red');
    });

    it('does not glue words of neighbouring blocks, lists or line breaks', () => {
        const { text } = buildPageText(
            page(
                '<p>one</p><p>two</p><ul><li>three</li><li>four</li></ul>five<br>six',
            ).body,
        );

        expect(text).toBe('one two three four five six');
    });

    it('leaves out what is hidden', () => {
        const { text } = buildPageText(
            page(
                '<p>shown</p><p hidden>hidden</p><div aria-hidden="true">also hidden</div><p>shown too</p>',
            ).body,
        );

        expect(text).toBe('shown shown too');
    });

    it('turns a span of the text into a range of the page, across inline elements', () => {
        const document = page(ARTICLE);
        const model = buildPageText(document.body);
        const start = model.text.indexOf('a living culture of wild yeast');
        const range = model.locate(
            start,
            start + 'a living culture of wild yeast'.length,
        );

        expect(range?.toString().replace(/\s+/g, ' ')).toBe(
            'a living culture of wild yeast',
        );
    });

    it('gives the place in the text of a place in the page', () => {
        const document = page('<p>Hello <b>big</b> world</p>');
        const model = buildPageText(document.body);
        const world = document.querySelector('p')?.lastChild as Text;

        expect(model.offsetOf(world, 1)).toBe(
            model.text.indexOf('world') - 1 + 1,
        );
        expect(model.offsetOf(world, world.data.length)).toBe(
            model.text.length,
        );
        expect(model.offsetOf(document.querySelector('b') as Element, 0)).toBe(
            model.text.indexOf('big'),
        );
    });
});

describe('finding a highlight again', () => {
    it('finds a passage that is on the page once, wherever the old position says', () => {
        const model = buildPageText(page(ARTICLE).body);
        const quote: Quote = {
            text: 'wild yeast and bacteria',
            prefix: '',
            suffix: '',
            startOffset: 5000,
        };

        expect(textAt(anchor(model, quote))).toBe('wild yeast and bacteria');
    });

    it('picks the occurrence whose surroundings match when the passage is there more than once', () => {
        const document = page(ARTICLE);
        const model = buildPageText(document.body);

        const second =
            model.text.indexOf(
                'a living culture needs care'.replace('a ', 'A '),
            ) + 2;
        const third = model.text.indexOf('a living culture rewards');
        const quote = (offset: number): Quote =>
            quoteOf(model, offset, offset + 'living culture'.length) as Quote;

        for (const offset of [
            model.text.indexOf('living culture'),
            second,
            third,
        ]) {
            const found = anchor(model, {
                ...quote(offset),
                startOffset: null,
            });

            expect(found).toEqual({
                start: offset,
                end: offset + 'living culture'.length,
            });
        }
    });

    it('does not trust the old position over the surroundings', () => {
        const model = buildPageText(page(ARTICLE).body);
        const offset = model.text.lastIndexOf('living culture');
        const quote = quoteOf(
            model,
            offset,
            offset + 'living culture'.length,
        ) as Quote;

        expect(anchor(model, { ...quote, startOffset: 0 })).toEqual({
            start: offset,
            end: offset + 'living culture'.length,
        });
    });

    it('still finds the passage when the white space of the page changed', () => {
        const before = buildPageText(page(ARTICLE).body);
        const offset = before.text.indexOf('wild yeast');
        const quote = quoteOf(
            before,
            offset,
            offset + 'wild yeast and bacteria'.length,
        ) as Quote;

        const reflowed = page(
            '<article><p>A sourdough starter is a\n\n   <b>living   culture</b>\n of wild\tyeast   and bacteria\n that you keep alive.</p></article>',
        );

        expect(textAt(anchor(buildPageText(reflowed.body), quote))).toBe(
            'wild yeast and bacteria',
        );
    });

    it('still finds the passage when its paragraph moved', () => {
        const before = buildPageText(page(ARTICLE).body);
        const offset = before.text.indexOf('Feed it with flour');
        const quote = quoteOf(
            before,
            offset,
            offset + 'Feed it with flour and water.'.length,
        ) as Quote;

        const moved = page(
            '<p>Intro that is new.</p><p>Feed it with flour and water.</p><h2>Later</h2><p>A sourdough starter is alive.</p>',
        );

        expect(textAt(anchor(buildPageText(moved.body), quote))).toBe(
            'Feed it with flour and water.',
        );
    });

    it('does not find a passage that was deleted or rewritten', () => {
        const before = buildPageText(page(ARTICLE).body);
        const offset = before.text.indexOf('wild yeast and bacteria');
        const quote = quoteOf(
            before,
            offset,
            offset + 'wild yeast and bacteria'.length,
        ) as Quote;

        const rewritten = buildPageText(
            page(
                '<p>A sourdough starter is a living culture of wild yeast and some bacteria.</p>',
            ).body,
        );
        const deleted = buildPageText(
            page('<p>Nothing like it here.</p>').body,
        );

        expect(anchor(rewritten, quote)).toBeNull();
        expect(anchor(deleted, quote)).toBeNull();
    });

    it('leaves a passage unpainted rather than guess between occurrences it cannot tell apart', () => {
        const model = buildPageText(
            page(
                '<p>The end.</p><p>Something else entirely.</p><p>The end.</p>',
            ).body,
        );

        // The kept surroundings match neither place any more, and there is no position to go by.
        expect(
            anchor(model, {
                text: 'The end.',
                prefix: 'a chapter that was cut',
                suffix: 'and then silence',
                startOffset: null,
            }),
        ).toBeNull();
        // With no surroundings at all and no position, the same.
        expect(
            anchor(model, {
                text: 'The end.',
                prefix: '',
                suffix: '',
                startOffset: null,
            }),
        ).toBeNull();
    });

    it('lets the old position decide between equal places when it points clearly at one', () => {
        const filler = '<p>' + 'x '.repeat(400) + '</p>';
        const model = buildPageText(
            page(`<p>The end.</p>${filler}<p>The end.</p>`).body,
        );
        const second = model.text.lastIndexOf('The end.');

        expect(
            anchor(model, {
                text: 'The end.',
                prefix: '',
                suffix: '',
                startOffset: second - 3,
            }),
        ).toEqual({ start: second, end: second + 8 });
        expect(
            anchor(model, {
                text: 'The end.',
                prefix: '',
                suffix: '',
                startOffset: 2,
            }),
        ).toEqual({ start: 0, end: 8 });
    });
});

describe('the quote of a span', () => {
    it('trims the passage and keeps up to 64 characters of context on each side', () => {
        const model = buildPageText(
            page(
                '<p>' +
                    'before '.repeat(20) +
                    'THE PASSAGE' +
                    ' after'.repeat(20) +
                    '</p>',
            ).body,
        );
        const start = model.text.indexOf('THE PASSAGE');
        const quote = quoteOf(
            model,
            start - 1,
            start + 'THE PASSAGE'.length + 1,
        ) as Quote;

        expect(quote.text).toBe('THE PASSAGE');
        expect(quote.prefix.length).toBe(64);
        expect(quote.suffix.length).toBe(64);
        expect(quote.startOffset).toBe(start);
        expect(quoteOf(model, 3, 3)).toBeNull();
    });
});
