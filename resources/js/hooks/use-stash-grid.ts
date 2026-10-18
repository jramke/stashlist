import { prefetchPage } from '@/lib/prefetch';
import { play } from '@/lib/sound';
import type { Stash } from '@/machines/stash-card';
import { show } from '@/routes/stashes';
import { isGridCollection } from '@zag-js/collection';
import * as listbox from '@zag-js/listbox';
import { normalizeProps, useMachine } from '@zag-js/react';
import {
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

/** How many columns the browser laid the grid out in, read back from the grid itself so the two always agree. */
function useColumns(listId: string, present: boolean, fallback = 4): number {
    const [columns, setColumns] = useState(fallback);

    useLayoutEffect(() => {
        const list = present ? document.getElementById(listId) : null;

        if (list === null) {
            return;
        }

        const read = () => {
            const count = getComputedStyle(list)
                .gridTemplateColumns.split(' ')
                .filter((track) => track !== '').length;

            setColumns(Math.max(1, count));
        };

        read();

        const observer = new ResizeObserver(read);
        observer.observe(list);

        return () => observer.disconnect();
    }, [listId, present]);

    return columns;
}

/**
 * The feed as a listbox (zag) laid out as a grid: one tab stop, arrow keys through the rows and columns,
 * Home and End, Enter to open. The highlighted card is the one the keyboard is on. Opening goes through
 * `onSelect`, which is cleared at once so the same card can be opened again.
 */
export function useStashGrid(stashes: Stash[], onOpen: (id: number) => void) {
    const id = useId();
    const listId = `${id}-grid`;
    const columns = useColumns(listId, stashes.length > 0);
    const api = useRef<listbox.Api | null>(null);
    const prefetch = useRef<number>(undefined);

    const collection = useMemo(
        () =>
            listbox.gridCollection({
                items: stashes,
                columnCount: columns,
                itemToValue: (stash: Stash) => String(stash.id),
                itemToString: (stash: Stash) =>
                    stash.title ?? stash.domain ?? '',
            }),
        [stashes, columns],
    );

    const service = useMachine(listbox.machine, {
        id,
        ids: { list: listId },
        collection,
        selectionMode: 'single',
        // The letters are shortcuts (j, k, x, t, o ...); typing ahead would fight them.
        typeahead: false,
        // Keyboard moves jump: nothing that is used all day animates.
        scrollToIndexFn: ({ getElement }) =>
            getElement()?.scrollIntoView({ block: 'nearest' }),
        onHighlightChange: ({ highlightedValue }) => {
            clearTimeout(prefetch.current);

            if (highlightedValue === null) {
                return;
            }

            play('tick');
            // Warms the page of the card the keyboard rests on, so Enter opens it at once.
            prefetch.current = window.setTimeout(
                () => prefetchPage(show(Number(highlightedValue)).url),
                150,
            );
        },
        onSelect: ({ value }) => {
            onOpen(Number(value));
            queueMicrotask(() => api.current?.clearValue());
        },
    });

    const grid = listbox.connect(service, normalizeProps);

    useEffect(() => {
        api.current = grid;
    });

    useEffect(() => () => clearTimeout(prefetch.current), []);

    return { api: grid, listId, columns };
}

/**
 * Whether the highlighted card is on the first row. The collection answers "the card above" with the card itself
 * when there is none, so that is what is compared.
 */
export function onFirstRow(api: listbox.Api): boolean {
    const at = api.highlightedValue;

    if (at === null || !isGridCollection(api.collection)) {
        return false;
    }

    const above = api.collection.getPreviousRowValue(at);

    return above === null || above === at;
}

export type StashGrid = ReturnType<typeof useStashGrid>;
