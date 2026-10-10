import { browserPaintTarget } from '@/lib/highlights/paint';
import { showHighlights } from '@/lib/highlights/show';

const STARTED = '__stashlistHighlights';

// Not in the manifest, so it costs no permission at install: it is registered as a content script when the
// person turns on "Show my highlights on pages" (and so grants access to all sites), and injected on demand
// into the tab where a highlight was just made.
export default defineUnlistedScript(() => {
    const target = browserPaintTarget();
    const scope = globalThis as unknown as Record<string, unknown>;

    // Registered and injected both: the first one runs.
    if (target === null || scope[STARTED] === true) {
        return;
    }

    scope[STARTED] = true;
    void showHighlights({ document, href: location.href, target });
});
