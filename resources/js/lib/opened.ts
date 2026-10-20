import { router } from '@inertiajs/react';

/** The card that was opened from the feed, and the address of the feed it was opened from. */
let opened: { id: number; feed: string } | null = null;

// Opening a card goes to the stash page (and on to the cards that page offers); anywhere else the person has left
// the thread, and the feed they come back to later is a new one.
router.on('navigate', ({ detail }) => {
    if (!['stashes/index', 'stashes/show'].includes(detail.page.component)) {
        opened = null;
    }
});

/** Remembers the card that is being opened, so the feed can put the keyboard back on it when the person returns. */
export function rememberOpened(id: number): void {
    opened = { id, feed: window.location.pathname + window.location.search };
}

/**
 * The card the person opened last, if this is the feed they opened it from. It stays until the person leaves the
 * thread (see above) or opens another card, because the feed can be drawn twice on the way back (from the history,
 * then again when it is asked for fresh), and the keyboard has to end up on the card the second time too.
 */
export function openedHere(): number | null {
    return opened?.feed === window.location.pathname + window.location.search
        ? opened.id
        : null;
}

/** The person went to the box on their own: the card they came from is no longer where the keyboard should go. */
export function forgetOpened(): void {
    opened = null;
}
