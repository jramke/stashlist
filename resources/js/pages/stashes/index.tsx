import StashController from '@/actions/App/Http/Controllers/StashController';
import { Omnibar } from '@/components/omnibar';
import { StashCard } from '@/components/stash-card';
import { Spinner } from '@/components/ui/spinner';
import { useFlashNote } from '@/hooks/use-flash-note';
import {
    directionOf,
    focusCard,
    focusedCard,
    moveTo,
    neighbour,
} from '@/lib/grid';
import { focusBox, isTyping } from '@/lib/keys';
import type { Scroll } from '@/types';
import { Head, InfiniteScroll, router, usePoll } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

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
    const latest = useRef({ note, stashes });

    useEffect(() => {
        latest.current = { note, stashes };
    });

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

    // The keyboard in the feed: arrows (or j and k) move between the cards, Backspace deletes, Cmd+Z takes it back.
    useEffect(() => {
        function keyDown(event: KeyboardEvent) {
            if (event.defaultPrevented) {
                return;
            }

            const undoUrl = latest.current.note?.undo_url ?? null;

            if (
                (event.metaKey || event.ctrlKey) &&
                event.key === 'z' &&
                undoUrl !== null &&
                !isTyping(event.target)
            ) {
                event.preventDefault();
                router.delete(undoUrl, { preserveScroll: true });

                return;
            }

            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            const card = focusedCard();

            if (isTyping(event.target)) {
                return;
            }

            const direction = directionOf(event.key);

            if (direction !== undefined) {
                event.preventDefault();

                if (card !== null && direction === 'up') {
                    const above = neighbour('up');

                    if (above === null) {
                        focusBox();
                    } else {
                        moveTo(above);
                    }
                } else {
                    card === null
                        ? focusCard('first')
                        : moveTo(neighbour(direction));
                }
            } else if (
                card !== null &&
                ['Backspace', 'Delete', 'x'].includes(event.key)
            ) {
                event.preventDefault();
                remove(card);
            }
        }

        document.addEventListener('keydown', keyDown);

        return () => document.removeEventListener('keydown', keyDown);
    }, []);

    /** Takes the card off the screen now and asks the server; the note in the box offers the undo. */
    function remove(card: HTMLElement) {
        const id = Number(card.dataset.stash);
        // The focus goes to the card that takes its place.
        const next =
            neighbour('right') ??
            neighbour('down') ??
            neighbour('left') ??
            neighbour('up');

        setGone((ids) => [...ids, id]);
        requestAnimationFrame(() => next?.focus());
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
    const visible = stashes.data.filter((stash) => !gone.includes(stash.id));

    return (
        <>
            <Head title="Stashes" />

            <div className="mx-auto max-w-7xl">
                <Omnibar
                    filters={filters}
                    tags={tags}
                    initial={share}
                    note={note}
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
                    <InfiniteScroll
                        data="stashes"
                        className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
                        loading={
                            <div className="flex justify-center py-6">
                                <Spinner />
                            </div>
                        }
                    >
                        {visible.map((stash) => (
                            <StashCard
                                key={stash.id}
                                stash={stash}
                                fresh={
                                    freshAfter !== null && stash.id > freshAfter
                                }
                            />
                        ))}
                    </InfiniteScroll>
                )}
            </div>
        </>
    );
}
