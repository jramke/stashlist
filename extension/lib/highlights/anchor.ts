import type { PageText } from './page-text';

/** What is kept of a highlight to find it again (the W3C TextQuote and TextPosition selectors). */
export type Quote = {
    text: string;
    prefix: string;
    suffix: string;
    /** Where the passage was in the page text when it was marked: a hint, never trusted. */
    startOffset: number | null;
};

/** How much of a highlight's surroundings is kept. */
export const CONTEXT_LENGTH = 64;

/**
 * Finds a highlight in a page: the passage itself, nothing like it. The passage is searched for in the text of
 * the page; when it is there more than once, the place whose surroundings are most like the ones kept wins, and
 * the old position only breaks ties. A passage that was deleted or rewritten is not found, by design, and one
 * that cannot be told from another occurrence is not painted rather than painted in the wrong place.
 *
 * @returns the span of the passage in `page.text`, or null
 */
export function anchor(
    page: PageText,
    quote: Quote,
): { start: number; end: number } | null {
    const needle = collapse(quote.text);

    if (needle === '') {
        return null;
    }

    const places = occurrences(page.text, needle);

    if (places.length === 0) {
        return null;
    }

    const only = places.length === 1 ? places[0] : undefined;

    if (only !== undefined) {
        return { start: only, end: only + needle.length };
    }

    const chosen = choose(page.text, needle, places, quote);

    return chosen === null
        ? null
        : { start: chosen, end: chosen + needle.length };
}

/**
 * The quote for the passage between two places of the page text. The passage is trimmed; the context is
 * whatever surrounds it, up to CONTEXT_LENGTH characters on each side.
 */
export function quoteOf(
    page: PageText,
    start: number,
    end: number,
): Quote | null {
    let from = start;
    let to = end;

    while (from < to && page.text.charAt(from) === ' ') from++;
    while (to > from && page.text.charAt(to - 1) === ' ') to--;

    if (from >= to) {
        return null;
    }

    return {
        text: page.text.slice(from, to),
        prefix: page.text.slice(Math.max(0, from - CONTEXT_LENGTH), from),
        suffix: page.text.slice(to, to + CONTEXT_LENGTH),
        startOffset: from,
    };
}

/** Several places for one passage: the one with the best matching surroundings, or null when none stands out. */
function choose(
    text: string,
    needle: string,
    places: number[],
    quote: Quote,
): number | null {
    const prefix = collapse(quote.prefix);
    const suffix = collapse(quote.suffix);
    const hasContext = prefix !== '' || suffix !== '';

    const scored = places
        .map((place) => ({
            place,
            score: contextScore(text, place, needle.length, prefix, suffix),
            distance:
                quote.startOffset === null
                    ? Number.POSITIVE_INFINITY
                    : Math.abs(place - quote.startOffset),
        }))
        .sort((a, b) => b.score - a.score || a.distance - b.distance);

    const best = scored[0];
    const next = scored[1];

    if (best === undefined || next === undefined) {
        return best?.place ?? null;
    }

    // The context says nothing for any of them: the surroundings changed, and a guess could be wrong.
    if (hasContext && best.score === 0) {
        return null;
    }

    if (best.score > next.score) {
        return best.place;
    }

    // Equal scores: the old position decides only when it points clearly at one of them.
    return best.distance + NEAR < next.distance ? best.place : null;
}

/** An old position counts as "clearly" this much nearer than the next place. */
const NEAR = 200;

/** 0 to 2: how much of the kept prefix and suffix is found around a place. */
function contextScore(
    text: string,
    place: number,
    length: number,
    prefix: string,
    suffix: string,
): number {
    const before = text
        .slice(Math.max(0, place - prefix.length - 2), place)
        .trimEnd();
    const after = text
        .slice(place + length, place + length + suffix.length + 2)
        .trimStart();

    return (
        share(commonSuffix(prefix, before), prefix.length) +
        share(commonPrefix(suffix, after), suffix.length)
    );
}

function share(matching: number, length: number): number {
    return length === 0 ? 0 : matching / length;
}

function commonPrefix(a: string, b: string): number {
    let length = 0;

    while (
        length < a.length &&
        length < b.length &&
        a.charAt(length) === b.charAt(length)
    )
        length++;

    return length;
}

function commonSuffix(a: string, b: string): number {
    let length = 0;

    while (
        length < a.length &&
        length < b.length &&
        a.charAt(a.length - 1 - length) === b.charAt(b.length - 1 - length)
    )
        length++;

    return length;
}

function occurrences(text: string, needle: string): number[] {
    const found: number[] = [];

    for (
        let at = text.indexOf(needle);
        at !== -1;
        at = text.indexOf(needle, at + 1)
    ) {
        found.push(at);
    }

    return found;
}

/** White space runs become one space and the ends are trimmed: how the page text is written. */
export function collapse(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}
