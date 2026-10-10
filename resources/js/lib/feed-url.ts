import { index } from '@/routes/stashes';

type Filters = App.Data.FeedFiltersData;

/** The two requests of the as-you-type contract: fast keyword results first, the smarter ones after a pause. */
export type SearchMode = 'keyword' | 'hybrid';

/**
 * The URL of the feed with some filters changed. Empty filters leave no trace in the URL, and the status filter
 * is dropped while searching, because the search does not know it.
 */
export function feedUrl(
    filters: Filters,
    change: Partial<Filters> = {},
    mode?: SearchMode,
): string {
    const next = { ...filters, ...change };
    const searching = next.q !== null;

    return index({
        query: {
            type: next.type ?? undefined,
            status: searching ? undefined : (next.status ?? undefined),
            collection: next.collection ?? undefined,
            tag: next.tags.length > 0 ? [...next.tags] : undefined,
            q: next.q ?? undefined,
            mode: searching ? mode : undefined,
        },
    }).url;
}
