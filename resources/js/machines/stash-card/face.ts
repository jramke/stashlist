import type {
    CardFace,
    CardIndicator,
    CardPhase,
    CardStatus,
    Glyph,
    MediaStatus,
    Stash,
} from './types';

/**
 * What a card says about a stash, decided in one place and with no DOM in it: which phase it is in, what the
 * middle shows, what the corners say. The machine calls these; the playground shows every answer they can give.
 *
 * Faces, by what the stash is:
 *  - a picture (an image, or a link with a page picture): the picture in its own ratio on the gray; a video
 *    gets a play button over it
 *  - a color: the swatch
 *  - a note: the text itself, fading at the bottom; a quote is set in a serif italic with a mark
 *  - a file: a sheet with its extension
 *  - a link without a picture (not read yet, no picture, or the picture is broken): a tile. A subtype has its
 *    own glyph and tint (article, product, video, post, repository, paper, recipe, quote); a plain link has
 *    the first letter of its site on a tint taken from the site, so the same site always looks the same
 */

/** What the server says maps to the phase the card shows. A failure beats everything: it is what needs a look. */
export function phaseOf(stash: Stash): CardPhase {
    if (stash.ai_status === 'failed') {
        return 'failed';
    }

    if (stash.fetching) {
        return 'fetching';
    }

    return stash.tagging ? 'tagging' : 'ready';
}

export function initialMedia(stash: Stash): MediaStatus {
    return stash.thumbnail === null ? 'none' : 'loading';
}

const SUBTYPE_GLYPHS: Record<string, Glyph> = {
    article: 'article',
    product: 'product',
    video: 'video',
    social: 'social',
    repo: 'repo',
    paper: 'paper',
    recipe: 'recipe',
    quote: 'quote',
};

export function glyphOf(stash: Stash): Glyph {
    switch (stash.type) {
        case 'note':
            return stash.subtype === 'quote' ? 'quote' : 'note';
        case 'image':
            return 'image';
        case 'file':
            return 'file';
        case 'color':
            return 'color';
        default:
            return SUBTYPE_GLYPHS[stash.subtype ?? ''] ?? 'link';
    }
}

export const GLYPH_LABELS: Record<Glyph, string> = {
    link: 'Link',
    article: 'Article',
    product: 'Product',
    video: 'Video',
    social: 'Post',
    repo: 'Repository',
    paper: 'Paper',
    recipe: 'Recipe',
    quote: 'Quote',
    note: 'Note',
    image: 'Image',
    file: 'File',
    color: 'Color',
};

/** The hue (of OKLCH) each kind is tinted with when it has no picture. Calm: the tile only leans toward it. */
const GLYPH_HUES: Partial<Record<Glyph, number>> = {
    article: 255,
    product: 65,
    video: 25,
    social: 225,
    repo: 300,
    paper: 155,
    recipe: 105,
    quote: 340,
    image: 200,
    file: 250,
};

/** A small, stable number from a string, so the same site always gets the same tint. */
function hash(text: string): number {
    let value = 0;

    for (const char of text) {
        value = (value * 31 + char.codePointAt(0)!) % 360;
    }

    return value;
}

function monogramOf(stash: Stash): string | null {
    const source = (stash.domain ?? stash.title ?? '').replace(/^www\./, '');
    const letter = Array.from(source).find((char) => /\p{L}|\p{N}/u.test(char));

    return letter === undefined ? null : letter.toUpperCase();
}

function extensionOf(stash: Stash): string {
    const match = /\.([a-z0-9]{1,5})(?:[?#].*)?$/i.exec(
        stash.title ?? stash.url ?? '',
    );

    return (match?.[1] ?? 'file').toUpperCase();
}

/** The middle of the card. */
export function faceOf(stash: Stash, media: MediaStatus): CardFace {
    const glyph = glyphOf(stash);

    if (stash.type === 'color') {
        return { kind: 'swatch', color: stash.body ?? 'transparent' };
    }

    if (stash.type === 'note') {
        return {
            kind: 'note',
            text: (stash.body ?? '').slice(0, 600),
            quote: glyph === 'quote',
        };
    }

    if (stash.thumbnail !== null && media !== 'broken') {
        return {
            kind: 'photo',
            src: stash.thumbnail.url,
            srcset: stash.thumbnail.srcset,
            width: stash.thumbnail.width,
            height: stash.thumbnail.height,
            tint: stash.colors[0]?.hex ?? null,
            play: glyph === 'video',
        };
    }

    if (stash.type === 'file') {
        return { kind: 'file', extension: extensionOf(stash) };
    }

    return {
        kind: 'tile',
        glyph,
        hue:
            GLYPH_HUES[glyph] ??
            hash(stash.domain ?? stash.title ?? String(stash.id)),
        // A plain link is told by its site; the other kinds are told by their glyph.
        monogram: glyph === 'link' ? monogramOf(stash) : null,
    };
}

/** The line under the middle, or null when there is none: a note is its own text. */
export function titleOf(stash: Stash): string | null {
    if (stash.type === 'color') {
        return stash.body?.toUpperCase() ?? null;
    }

    const title = stash.title ?? (stash.type === 'note' ? null : stash.domain);

    return title === null || title === '' ? null : title;
}

/** The top left corner. */
export function indicatorOf(stash: Stash): CardIndicator {
    const glyph = glyphOf(stash);

    return { glyph, label: GLYPH_LABELS[glyph] };
}

/** The top right corner: what the pipeline is doing with the stash, or just did. */
export function statusesOf(
    stash: Stash,
    phase: CardPhase,
    arrived: boolean,
): CardStatus[] {
    switch (phase) {
        case 'fetching':
            return [{ kind: 'fetching', label: 'Fetching', detail: null }];
        case 'tagging':
            return [{ kind: 'tagging', label: 'Tagging', detail: null }];
        case 'failed':
            return [
                { kind: 'failed', label: 'Failed', detail: stash.ai_error },
            ];
        default:
            return arrived
                ? [{ kind: 'arrived', label: 'Done', detail: null }]
                : [];
    }
}

/** How a screen reader hears the card: what it is, what it is called, what is going on. */
export function describe(stash: Stash, phase: CardPhase): string {
    // A note has no title: it is its text, and the text is its name.
    const name =
        titleOf(stash) ??
        (stash.type === 'note' ? (stash.body ?? '').slice(0, 80) : '');
    const parts = [GLYPH_LABELS[glyphOf(stash)], name];

    if (phase === 'fetching') {
        parts.push('being fetched');
    } else if (phase === 'tagging') {
        parts.push('being tagged');
    } else if (phase === 'failed') {
        parts.push('failed');
    }

    return parts.filter((part) => part !== '').join(', ');
}
