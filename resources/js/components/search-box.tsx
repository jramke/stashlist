import { Input } from '@/components/ui/input';
import { feedUrl, type SearchMode } from '@/lib/feed-url';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/** Pauses after the last keystroke before each request of the contract (plan 2.5). */
const KEYWORD_DELAY = 120;
const HYBRID_DELAY = 400;

/** The server embeds nothing shorter than this, so a second request would only repeat the first. */
const HYBRID_MIN_LENGTH = 3;

/**
 * Search as you type. A pause of about 120 ms asks for the keyword results, a longer one for the hybrid
 * results, which replace them. Both reload only the list, keep the input and replace the history entry; a new
 * keystroke drops the timers and Inertia cancels the visit that is still running.
 */
export function SearchBox({ filters }: { filters: App.Data.FeedFiltersData }) {
    const [text, setText] = useState(filters.q ?? '');
    const timers = useRef<number[]>([]);
    // What the page was last asked for. An answer that echoes it is ours; anything else came from outside.
    const requested = useRef(filters.q ?? '');

    useEffect(() => {
        const shown = filters.q ?? '';

        if (shown !== requested.current) {
            // The sidebar or the back button changed the query behind our back.
            requested.current = shown;
            setText(shown);
        }
    }, [filters.q]);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    function visit(query: string, mode: SearchMode) {
        requested.current = query;

        router.get(
            feedUrl(filters, { q: query === '' ? null : query }, mode),
            {},
            {
                only: ['stashes', 'filters'],
                // The list is a merge prop (infinite scroll appends pages); a new query starts it over.
                reset: ['stashes'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    function change(value: string) {
        setText(value);
        timers.current.forEach(clearTimeout);

        const query = value.trim();

        if (query === requested.current) {
            return;
        }

        timers.current = [
            window.setTimeout(visit, KEYWORD_DELAY, query, 'keyword'),
        ];

        if (query.length >= HYBRID_MIN_LENGTH) {
            timers.current.push(
                window.setTimeout(visit, HYBRID_DELAY, query, 'hybrid'),
            );
        }
    }

    return (
        <Input
            type="search"
            value={text}
            onChange={(event) => change(event.target.value)}
            placeholder="Search your stashes"
            aria-label="Search your stashes"
            autoComplete="off"
            maxLength={200}
        />
    );
}
