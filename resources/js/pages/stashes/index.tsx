import { CaptureBox } from '@/components/capture-box';
import { FeedFilters } from '@/components/feed-filters';
import { StashCard } from '@/components/stash-card';
import { Spinner } from '@/components/ui/spinner';
import type { Scroll } from '@/types';
import { Head, InfiniteScroll, usePoll } from '@inertiajs/react';
import { useEffect } from 'react';

type Props = {
    stashes: Scroll<App.Data.StashData>;
    filters: App.Data.FeedFiltersData;
    tags: App.Data.TagData[];
    share: string | null;
};

/** How often the feed asks again while a card is still being filled in or tagged. */
const POLL_INTERVAL = 3000;

export default function Index({ stashes, filters, tags, share }: Props) {
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

    const filtered =
        filters.q !== null ||
        filters.type !== null ||
        filters.status !== null ||
        filters.collection !== null ||
        filters.tags.length > 0;

    return (
        <>
            <Head title="Stashes" />

            <div className="mx-auto grid max-w-7xl gap-6">
                <CaptureBox initial={share} />
                <FeedFilters filters={filters} tags={tags} />

                {stashes.data.length === 0 ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">
                        {filtered
                            ? 'Nothing matches.'
                            : 'Nothing here yet. Paste a link above to start.'}
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
                        {stashes.data.map((stash) => (
                            <StashCard key={stash.id} stash={stash} />
                        ))}
                    </InfiniteScroll>
                )}
            </div>
        </>
    );
}
