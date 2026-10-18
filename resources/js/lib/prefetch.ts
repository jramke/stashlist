import { router } from '@inertiajs/react';

/** How long after a change nothing is prefetched. */
const QUIET_AFTER = 1500;

let quietUntil = 0;

// A note from the server ("Deleted.") rides on the next response, whichever request that is. A prefetch that is
// answered in between takes it and throws it away, so nothing is prefetched while a change is on its way, or for
// a moment after.
router.on('start', ({ detail }) => {
    if (detail.visit.method !== 'get') {
        quietUntil = Infinity;
    }
});
router.on('finish', ({ detail }) => {
    if (detail.visit.method !== 'get') {
        quietUntil = Date.now() + QUIET_AFTER;
    }
});

/** Fetches a page ahead of the click, so opening it is instant, unless that could cost somebody a note. */
export function prefetchPage(url: string): void {
    if (Date.now() >= quietUntil) {
        router.prefetch(url, { method: 'get' }, { cacheFor: '30s' });
    }
}
