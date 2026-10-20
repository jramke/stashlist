import StashController from '@/actions/App/Http/Controllers/StashController';
import { useAction, useScope } from '@/commands/hooks';
import { Omnibar } from '@/components/omnibar';
import { StashGrid } from '@/components/stash-grid';
import { useFlashNote } from '@/hooks/use-flash-note';
import { onFirstRow, useStashGrid } from '@/hooks/use-stash-grid';
import { useStashMenu } from '@/hooks/use-stash-menu';
import { focusBox, focusGrid, inGrid } from '@/lib/keys';
import { openedHere, rememberOpened } from '@/lib/opened';
import { copyOf, copyStash, hasLink, openLink } from '@/lib/stash-actions';
import { show } from '@/routes/stashes';
import type { Scroll } from '@/types';
import { Head, router, usePoll } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

type Props = {
    stashes: Scroll<App.Data.StashData>;
    filters: App.Data.FeedFiltersData;
    tags: App.Data.TagData[];
    share: string | null;
};

/** How often the feed asks again while a card is still being filled in or tagged. */
const POLL_INTERVAL = 3000;

/** How long a new card counts as new: until then the cards above that mark animate in once. */
const FRESH_FOR = 4000;

export default function Index({ stashes, filters, tags, share }: Props) {
    const { note, clear } = useFlashNote();
    const [freshAfter, setFreshAfter] = useState<number | null>(null);
    // Cards that were deleted a moment ago and are gone from the screen before the server has said so.
    const [gone, setGone] = useState<number[]>([]);
    const waiting = stashes.data.some(
        (stash) => stash.fetching || stash.tagging,
    );
    const { start, stop } = usePoll(
        POLL_INTERVAL,
        { only: ['stashes'] },
        { autoStart: false },
    );
    useEffect(() => {
        if (waiting) {
            start();
        } else {
            stop();
        }
    }, [waiting, start, stop]);

    // The shared text sits in the box now; the address forgets it, so a reload or a save does not bring it back.
    useEffect(() => {
        if (share !== null) {
            window.history.replaceState(
                window.history.state,
                '',
                window.location.pathname,
            );
        }
    }, [share]);

    useEffect(() => {
        if (freshAfter === null) {
            return;
        }

        const timer = window.setTimeout(() => setFreshAfter(null), FRESH_FOR);

        return () => clearTimeout(timer);
    }, [freshAfter]);

    const visible = useMemo(
        () => stashes.data.filter((stash) => !gone.includes(stash.id)),
        [stashes.data, gone],
    );
    const grid = useStashGrid(visible, open);
    /** The card the keyboard is on. */
    const highlighted = () =>
        visible.find((stash) => String(stash.id) === grid.api.highlightedValue);
    const { onContextMenu, openHighlighted, menu } = useStashMenu({
        stashes: visible,
        highlightedId: () => highlighted()?.id ?? null,
        onHighlight: (id) => grid.api.highlightValue(String(id)),
        onOpen: open,
        onDelete: remove,
    });

    // Back from a stash the keyboard is on the card that was opened.
    useEffect(() => {
        const id = openedHere();

        // Only while nothing has the focus: a person who was quicker (a `/` for the box) keeps what they chose.
        const free =
            document.activeElement === null ||
            document.activeElement === document.body;

        if (free && id !== null && visible.some((stash) => stash.id === id)) {
            grid.api.highlightValue(String(id));
            focusGrid();
        }
        // Once, when the feed is shown.
    }, []);

    // The keyboard in the feed (the keys are in the catalog). The arrow keys, Home, End and Enter are the list's
    // own; j and k go a row, Backspace deletes, Cmd+Z takes it back, Escape goes back to the box.
    useScope('feed');
    useAction('grid.down', () => grid.api.highlightNext());
    useAction('grid.up', () => {
        // Up from the first row is the way back to the box.
        if (onFirstRow(grid.api)) {
            focusBox();
        } else {
            grid.api.highlightPrevious();
        }
    });
    useAction('card.delete', {
        run: () => {
            const value = grid.api.highlightedValue;

            if (value !== null) {
                remove(Number(value));
            }
        },
        enabled: () => inGrid() && grid.api.highlightedValue !== null,
    });
    useAction('card.open-link', {
        run: () => {
            const stash = highlighted();

            if (stash !== undefined) {
                openLink(stash);
            }
        },
        enabled: () => {
            const stash = highlighted();

            return inGrid() && stash !== undefined && hasLink(stash);
        },
    });
    useAction('card.copy', {
        run: () => {
            const stash = highlighted();

            if (stash !== undefined) {
                void copyStash(stash);
            }
        },
        enabled: () => {
            const stash = highlighted();

            return inGrid() && stash !== undefined && copyOf(stash) !== null;
        },
    });
    useAction('card.menu', {
        run: () => {
            openHighlighted();
        },
        enabled: () => inGrid() && highlighted() !== undefined,
    });
    useAction('stash.undo', {
        run: () => {
            if (note?.undo_url) {
                router.delete(note.undo_url, { preserveScroll: true });
            }
        },
        enabled: () => note?.undo_url != null,
    });

    /** Goes to the stash and remembers the card, so the keyboard is back on it when the person returns. */
    function open(id: number) {
        rememberOpened(id);
        router.visit(show(id).url);
    }

    /** Takes the card off the screen now and asks the server; the note in the box offers the undo. */
    function remove(id: number) {
        const at = visible.findIndex((stash) => stash.id === id);
        // The keyboard goes to the card that takes its place.
        const next = visible[at + 1] ?? visible[at - 1];

        if (next !== undefined) {
            grid.api.highlightValue(String(next.id));
        }

        setGone((ids) => [...ids, id]);
        router.delete(StashController.destroy.url(id), {
            preserveScroll: true,
            preserveState: true,
            onFinish: () =>
                setGone((ids) => ids.filter((other) => other !== id)),
        });
    }

    const filtered =
        filters.q !== null ||
        filters.type !== null ||
        filters.status !== null ||
        filters.collection !== null ||
        filters.color !== null ||
        filters.tags.length > 0;

    return (
        <>
            <Head title="Stashes" />

            <div className="mx-auto max-w-7xl">
                <Omnibar
                    filters={filters}
                    tags={tags}
                    initial={share}
                    note={note}
                    // Back from a stash the keyboard goes to the card that was opened, not to the box.
                    autoFocus={openedHere() === null}
                    onNoteDone={clear}
                    onStashed={() =>
                        setFreshAfter(
                            Math.max(0, ...stashes.data.map(({ id }) => id)),
                        )
                    }
                />

                {visible.length === 0 ? (
                    <p className="py-24 text-center text-sm text-muted-foreground">
                        {filtered
                            ? 'Nothing matches.'
                            : 'Nothing here yet. Paste a link, a color or a note above, or press / and start typing.'}
                    </p>
                ) : (
                    <StashGrid
                        grid={grid}
                        stashes={visible}
                        freshAfter={freshAfter}
                        scrollKey="stashes"
                        onLeaveTop={focusBox}
                        onContextMenu={onContextMenu}
                    />
                )}

                {menu}
            </div>
        </>
    );
}
