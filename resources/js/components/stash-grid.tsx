import { StashCard } from '@/components/stash-card';
import { Spinner } from '@/components/ui/spinner';
import { onFirstRow, type StashGrid as Grid } from '@/hooks/use-stash-grid';
import type { Stash } from '@/machines/stash-card';
import { InfiniteScroll } from '@inertiajs/react';
import type { MouseEvent } from 'react';

/**
 * The cards, in a plain CSS grid, as the parts of a listbox (`useStashGrid`). The grid is the list, the cards are
 * its items, and a pointer, a finger and the keyboard all go through the same list. Pages of more cards come in
 * as the end of the grid scrolls into view.
 */
export function StashGrid({
    grid,
    stashes,
    freshAfter,
    scrollKey,
    inert = false,
    onLeaveTop,
    onContextMenu,
}: {
    grid: Grid;
    stashes: Stash[];
    /** Cards with an id above this one are new: they come in with an entrance. */
    freshAfter: number | null;
    /** The page prop that holds the cards, when more of them come in as the end scrolls into view. */
    scrollKey?: string;
    /** The cards are made up (the playground): no addresses, nothing to prefetch. */
    inert?: boolean;
    /** The keyboard went up from the first row: out of the grid. */
    onLeaveTop: () => void;
    /** A right-click, a long press or the Menu key on the cards (the feed's menu). */
    onContextMenu?: (event: MouseEvent) => void;
}) {
    const { api } = grid;
    const content = api.getContentProps();
    // The list takes the focus on a press, as it does in zag, but without letting the browser scroll it into
    // view: the whole grid is the list, so a press on a card used to take the page to the top of the grid.
    const focusList = (event: MouseEvent) => {
        event.preventDefault();
        document.getElementById(grid.listId)?.focus({ preventScroll: true });
    };
    const list = {
        ...api.getListProps(),
        'data-stash-grid': '',
        className:
            'grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 outline-none',
    };
    const cards = stashes.map((stash) => {
        const state = api.getItemState({ item: stash });

        return (
            <StashCard
                key={stash.id}
                stash={stash}
                inert={inert}
                // The ring and the growing picture are for a keyboard that is on the card.
                highlighted={state.focusVisible}
                fresh={freshAfter !== null && stash.id > freshAfter}
                itemProps={{
                    ...api.getItemProps({ item: stash }),
                    onMouseDown: focusList,
                }}
            />
        );
    });

    return (
        <div {...api.getRootProps()} onContextMenu={onContextMenu}>
            <span {...api.getLabelProps()} className="sr-only">
                Your stashes
            </span>

            <div
                {...content}
                onKeyDown={(event) => {
                    // Up from the first row is the way back to the box.
                    if (event.key === 'ArrowUp' && onFirstRow(api)) {
                        event.preventDefault();
                        onLeaveTop();

                        return;
                    }

                    content.onKeyDown?.(event);
                }}
            >
                {scrollKey === undefined ? (
                    <div {...list}>{cards}</div>
                ) : (
                    <InfiniteScroll
                        data={scrollKey}
                        {...list}
                        loading={
                            <div className="flex justify-center py-6">
                                <Spinner />
                            </div>
                        }
                    >
                        {cards}
                    </InfiniteScroll>
                )}
            </div>
        </div>
    );
}
