import { classify } from '@/lib/classify';
import type { Chip, Filters, Kind, Leading, Row } from './types';

/** Pauses after the last keystroke before each request of the contract (plan 2.5). */
export const KEYWORD_DELAY = 120;
export const HYBRID_DELAY = 400;

/** The server embeds nothing shorter than this, so a second request would only repeat the first. */
export const HYBRID_MIN_LENGTH = 3;

/** The server refuses a query longer than this; anything longer is a note, not a search. */
export const MAX_QUERY = 200;

export const IMAGE_TYPES =
    'image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/heif';

/** The twelve color names the pictures are filed under, with the swatch shown for each. */
export const COLORS: Record<App.Enums.ColorName, string> = {
    red: '#e5484d',
    orange: '#f76b15',
    yellow: '#f5d90a',
    green: '#30a46c',
    teal: '#12a594',
    blue: '#0090ff',
    purple: '#8e4ec6',
    pink: '#e93d82',
    brown: '#a18072',
    black: '#1a1a1a',
    white: '#f5f5f5',
    gray: '#8b8d98',
};

const colorNames = Object.keys(COLORS) as App.Enums.ColorName[];

const TYPES: { value: App.Enums.StashType; label: string }[] = [
    { value: 'link', label: 'Links' },
    { value: 'note', label: 'Notes' },
    { value: 'image', label: 'Images' },
    { value: 'color', label: 'Colors' },
];

/** The kinds of link a page can be (what the card's corner icon says), as filters; "other" is left out. */
const SUBTYPES: { value: App.Enums.Subtype; label: string }[] = [
    { value: 'article', label: 'Articles' },
    { value: 'product', label: 'Products' },
    { value: 'video', label: 'Videos' },
    { value: 'social', label: 'Social' },
    { value: 'repo', label: 'Repos' },
    { value: 'paper', label: 'Papers' },
    { value: 'recipe', label: 'Recipes' },
    { value: 'quote', label: 'Quotes' },
];

export function isColorName(word: string): word is App.Enums.ColorName {
    return colorNames.some((name) => name === word);
}

/** What the text is searched for, or null when it is not a search at all (a link, a color code, a long note). */
export function queryOf(text: string): string | null {
    const query = text.trim();

    if (
        query === '' ||
        query.length > MAX_QUERY ||
        query.includes('\n') ||
        ['link', 'color'].includes(classify(query))
    ) {
        return null;
    }

    return query;
}

/**
 * A color word followed by a space at the end of the text becomes a chip; one more space and nothing was lost.
 * Gives the word and the text that is left, or null when the text does not end that way.
 */
export function colorWordIn(
    value: string,
): { word: App.Enums.ColorName; rest: string } | null {
    const found = /(^|\s)([a-z]+)\s$/i.exec(value);
    const word = found?.[2]?.toLowerCase();

    if (found === null || word === undefined || !isColorName(word)) {
        return null;
    }

    return { word, rest: value.slice(0, found.index) + (found[1] ?? '') };
}

/** Puts a word that was a chip back in front of the text. */
export function joinWord(word: string, text: string): string {
    return text === '' ? word : `${word} ${text}`;
}

/** The filters that are on, as chips. */
export function chipsOf(
    shown: Filters,
    tags: App.Data.TagData[],
    collections: App.Data.CollectionData[],
): Chip[] {
    const chips: Chip[] = [];

    if (shown.color !== null) {
        chips.push({
            key: `color:${shown.color}`,
            label: shown.color,
            swatch: COLORS[shown.color],
            without: { color: null },
            word: shown.color,
        });
    }

    if (shown.type !== null) {
        chips.push({
            key: `type:${shown.type}`,
            label:
                TYPES.find((type) => type.value === shown.type)?.label ??
                shown.type,
            without: { type: null },
        });
    }

    if (shown.subtype !== null) {
        chips.push({
            key: `subtype:${shown.subtype}`,
            label:
                SUBTYPES.find((subtype) => subtype.value === shown.subtype)
                    ?.label ?? shown.subtype,
            without: { subtype: null },
        });
    }

    if (shown.status !== null) {
        chips.push({
            key: `status:${shown.status}`,
            label: 'Failed',
            without: { status: null },
        });
    }

    if (shown.collection !== null) {
        chips.push({
            key: `collection:${shown.collection}`,
            label:
                shown.collection === 'none'
                    ? 'Unsorted'
                    : (collections.find(
                          (collection) =>
                              String(collection.id) === shown.collection,
                      )?.name ?? 'Collection'),
            without: { collection: null },
        });
    }

    for (const id of shown.tags) {
        chips.push({
            key: `tag:${id}`,
            label: tags.find((tag) => tag.id === id)?.name ?? 'Tag',
            without: { tags: shown.tags.filter((other) => other !== id) },
        });
    }

    return chips;
}

/** What the last word typed (or the whole text) could become. */
export function suggestionsOf(
    text: string,
    kind: Kind,
    shown: Filters,
    tags: App.Data.TagData[],
    collections: App.Data.CollectionData[],
): Row[] {
    const found: Row[] = [];
    const last = /(\S+)$/.exec(text)?.[1];

    if (last === undefined || last.length < 2 || kind !== 'text') {
        return found;
    }

    const before = text.slice(0, text.length - last.length);
    const fragments = [{ needle: last.toLowerCase(), rest: before }];

    if (/\s/.test(text.trim())) {
        fragments.push({ needle: text.trim().toLowerCase(), rest: '' });
    }

    const matches = (name: string, needle: string) =>
        name.toLowerCase().startsWith(needle);
    const filter = (
        key: string,
        kind: string,
        label: string,
        rest: string,
        change: Partial<Filters>,
        swatch?: string,
    ): Row => ({
        key,
        kind,
        label,
        ...(swatch === undefined ? {} : { swatch }),
        action: { type: 'filter', rest, change },
    });

    for (const { needle, rest } of fragments) {
        if (shown.color === null) {
            for (const name of colorNames) {
                if (matches(name, needle)) {
                    found.push(
                        filter(
                            `color:${name}`,
                            'Color',
                            name,
                            rest,
                            { color: name },
                            COLORS[name],
                        ),
                    );
                }
            }
        }

        if (shown.type === null) {
            for (const type of TYPES) {
                if (matches(type.label, needle)) {
                    found.push(
                        filter(`type:${type.value}`, 'Type', type.label, rest, {
                            type: type.value,
                        }),
                    );
                }
            }
        }

        if (shown.subtype === null) {
            for (const subtype of SUBTYPES) {
                if (matches(subtype.label, needle)) {
                    found.push(
                        filter(
                            `subtype:${subtype.value}`,
                            'Kind',
                            subtype.label,
                            rest,
                            { subtype: subtype.value },
                        ),
                    );
                }
            }
        }

        if (shown.status === null && matches('failed', needle)) {
            found.push(
                filter('status:failed', 'Status', 'Failed', rest, {
                    status: 'failed',
                }),
            );
        }

        if (shown.collection === null) {
            if (matches('unsorted', needle)) {
                found.push(
                    filter('collection:none', 'Collection', 'Unsorted', rest, {
                        collection: 'none',
                    }),
                );
            }

            for (const collection of collections) {
                if (matches(collection.name, needle)) {
                    found.push(
                        filter(
                            `collection:${collection.id}`,
                            'Collection',
                            collection.name,
                            rest,
                            { collection: String(collection.id) },
                        ),
                    );
                }
            }
        }

        for (const tag of tags) {
            if (!shown.tags.includes(tag.id) && matches(tag.name, needle)) {
                found.push(
                    filter(`tag:${tag.id}`, 'Tag', tag.name, rest, {
                        tags: [...shown.tags, tag.id],
                    }),
                );
            }
        }
    }

    const seen = new Set<string>();

    return found
        .filter((row) => !seen.has(row.key) && seen.add(row.key))
        .slice(0, 6);
}

/** What a click in the empty box offers: an image from disk, and the collections. */
export function menuOf(
    shown: Filters,
    collections: App.Data.CollectionData[],
): Row[] {
    const rows: Row[] = [
        {
            key: 'upload',
            kind: 'Image',
            label: 'Stash an image from your device',
            action: { type: 'upload' },
        },
    ];

    if (shown.collection === null) {
        for (const { id, name } of [
            { id: 'none', name: 'Unsorted' },
            ...collections.map((collection) => ({
                id: String(collection.id),
                name: collection.name,
            })),
        ]) {
            rows.push({
                key: `collection:${id}`,
                kind: 'Collection',
                label: name,
                action: {
                    type: 'filter',
                    rest: '',
                    change: { collection: id },
                },
            });
        }
    }

    return rows;
}

/** What sits in front of the text: a magnifier, a link, or the color that is typed. */
export function leadingOf(kind: Kind, text: string): Leading {
    if (kind === 'color') {
        return { kind: 'swatch', color: text.trim() };
    }

    return { kind: kind === 'link' ? 'link' : 'search' };
}

/** What the stash button offers to make of the text. */
export function stashLabelOf(kind: Kind): string {
    return kind === 'link'
        ? 'Stash link'
        : kind === 'color'
          ? 'Stash color'
          : 'Stash note';
}
