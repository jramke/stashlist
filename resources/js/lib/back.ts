import { index } from '@/routes/stashes';
import { router } from '@inertiajs/react';

let moved = false;

// Only a visit made inside the app counts: `history.back()` from the first page would leave the site.
router.on('navigate', ({ detail }) => {
    if (detail.type !== 'initial') {
        moved = true;
    }
});

/** One step back inside the app, or to the feed when there is nothing to go back to. */
export function goBack(): void {
    if (moved) {
        window.history.back();
    } else {
        router.visit(index().url);
    }
}
