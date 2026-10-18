import type { Stash } from '@/machines/stash-card';

/**
 * Made-up stashes for the playground: one of every kind, in every state a card can be in. Pictures come from
 * `/playground/art`, which draws any size and color, and can be slow or broken on request.
 */

/**
 * A number made from some text. The page is rendered on the server and again in the browser, and the two must
 * agree, so a fixture's id comes from what the fixture says and not from a counter.
 */
function idOf(text: string): number {
    let hash = 5381;

    for (let index = 0; index < text.length; index++) {
        hash = (hash * 33 + text.charCodeAt(index)) % 1_000_000;
    }

    return 1000 + hash;
}

/** A stash with every field filled in, so a fixture only says what is special about it. */
export function stash(overrides: Partial<Stash> = {}): Stash {
    return {
        id: idOf(JSON.stringify(overrides)),
        type: 'link',
        subtype: null,
        title: 'A page worth keeping',
        description: null,
        summary: null,
        url: 'https://example.com/a-page',
        domain: 'example.com',
        body: null,
        ai_status: 'done',
        ai_error: null,
        thumbnail: null,
        colors: [],
        tags: [],
        created_at: '2026-10-18T10:00:00.000Z',
        fetching: false,
        tagging: false,
        ...overrides,
    };
}

/** A hex color from a hue, for the tint a picture waits on. */
function tint(hue: number): string {
    const [s, l] = [0.65, 0.6];
    const k = (n: number) => (n + hue / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const channel = (n: number) =>
        Math.round(
            255 *
                (l -
                    a *
                        Math.max(
                            -1,
                            Math.min(k(n) - 3, Math.min(9 - k(n), 1)),
                        )),
        )
            .toString(16)
            .padStart(2, '0');

    return `#${channel(0)}${channel(8)}${channel(4)}`;
}

type Art = Pick<NonNullable<Stash['thumbnail']>, 'url' | 'width' | 'height'>;

/**
 * A picture of the given size; `delay` (seconds) makes it slow, `status` makes it fail, and `again` is a number
 * that makes the browser ask once more instead of using what it kept.
 */
export function art(
    width: number,
    height: number,
    hue: number,
    extra: { delay?: number; status?: number; again?: number } = {},
): { thumbnail: Art; colors: Stash['colors'] } {
    const query = new URLSearchParams({
        w: String(width),
        h: String(height),
        hue: String(hue),
        ...(extra.delay === undefined ? {} : { delay: String(extra.delay) }),
        ...(extra.status === undefined ? {} : { status: String(extra.status) }),
        ...(extra.again === undefined ? {} : { n: String(extra.again) }),
    });

    return {
        thumbnail: { url: `/playground/art?${query}`, width, height },
        colors: [{ hex: tint(hue), pct: 0.6 }],
    };
}

export const LONG_NOTE = `The best ideas arrive while walking. Take a notebook, never a phone.

Things to try this week:
- write the first paragraph before opening any app
- ask the bakery on Elm street about the rye flour
- finish the sketch of the front page before lunch
- send the invoice, again, politely

None of this is urgent, and all of it is what the week is about. Keep the list short enough to read at a glance and long enough to be worth keeping.`;

export const SUBTYPES = [
    'article',
    'product',
    'video',
    'social',
    'repo',
    'paper',
    'recipe',
    'quote',
] as const;

const SUBTYPE_SITES: Record<(typeof SUBTYPES)[number], [string, string]> = {
    article: ['How to raise a sourdough starter', 'breadlab.example'],
    product: ['The Everyday Chef Knife, 20 cm', 'kitchen.example'],
    video: ['A short film about a very long bridge', 'vimeo.com'],
    social: ['Thread: what I learned shipping alone', 'social.example'],
    repo: ['jramke/stashlist: a place for everything', 'github.com'],
    paper: ['Attention as a scarce resource', 'arxiv.org'],
    recipe: ['Slow-roasted tomatoes with thyme', 'recipes.example'],
    quote: ['“Simplicity is hard to build”', 'quotes.example'],
};

const SUBTYPE_HUES: Record<(typeof SUBTYPES)[number], number> = {
    article: 255,
    product: 65,
    video: 25,
    social: 225,
    repo: 300,
    paper: 155,
    recipe: 105,
    quote: 340,
};

/** A link of the given subtype, with a page picture or without. */
export function subtype(
    name: (typeof SUBTYPES)[number],
    withPicture: boolean,
): Stash {
    const [title, domain] = SUBTYPE_SITES[name];

    return stash({
        subtype: name,
        title,
        domain,
        url: `https://${domain}/example`,
        ...(withPicture ? art(1200, 630, SUBTYPE_HUES[name]) : {}),
    });
}

export const PLAIN_SITES: [string, string][] = [
    ['Design systems, explained', 'figma.com'],
    ['Show HN: a small tool', 'news.ycombinator.com'],
    ['The long read', 'nytimes.com'],
    ['Kitchen lighting notes', 'homestudy.example'],
    ['Docs: getting started', 'laravel.com'],
    ['Untitled', 'x.com'],
];

/** The pipeline of one stash, step by step: fetched, tagged, done (or failed). */
export function pipeline(
    step: 'fetching' | 'tagging' | 'ready' | 'failed',
    id: number,
): Stash {
    const base = {
        id,
        title: 'Notes on kitchen lighting',
        domain: 'homestudy.example',
        url: 'https://homestudy.example/lighting',
    };

    switch (step) {
        case 'fetching':
            return stash({
                ...base,
                title: null,
                fetching: true,
                ai_status: 'pending',
            });
        case 'tagging':
            return stash({
                ...base,
                tagging: true,
                ai_status: 'processing',
                subtype: 'article',
                ...art(1200, 630, 95),
            });
        case 'failed':
            return stash({
                ...base,
                title: null,
                ai_status: 'failed',
                ai_error: 'The page could not be read.',
            });
        default:
            return stash({
                ...base,
                subtype: 'article',
                ...art(1200, 630, 95),
            });
    }
}
