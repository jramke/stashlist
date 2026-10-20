/**
 * "Stash when I save": a person who stars a repository, bookmarks a post or saves a video on a site they turned
 * this on for gets that thing stashed too. Each site is one entry below; a click is checked against its rules in
 * the page itself and only the thing that was saved is sent on.
 *
 * The selectors are what these sites' markup looks like today and they change without notice. `tests/auto-stash.test.ts`
 * keeps the markup each rule was written against; when a site changes, replace the fixture with the new markup and
 * fix the rule until it passes.
 */

/** The message the page script sends to the background when something was saved. */
export const AUTO_STASH = 'stashlist:auto-stash';

/** What a save-like click put away, as far as the page shows it. */
export type SavedItem = {
    url: string;
    title?: string;
    /** What the page shows of it, for a site whose pages a server cannot read (a post on X). */
    text?: string;
};

/** The part of `location` a rule looks at. */
export type Where = { origin: string; pathname: string; search: string };

export type Platform = {
    id: 'github' | 'x' | 'youtube';
    label: string;
    /** What the person does on the site, in the words of the options page. */
    action: string;
    hosts: string[];
    /**
     * The item behind a click that saves it, or null for any other click, an undo included. The click has not
     * reached the page yet, so the control still shows what it showed before.
     */
    saved(target: Element, page: Where): SavedItem | null;
};

const github: Platform = {
    id: 'github',
    label: 'GitHub',
    action: 'Star a repository',
    hosts: ['github.com'],
    saved(target, page) {
        // The button that stars sits in a form that posts to `/<owner>/<repo>/star`; the one that undoes it, to `/unstar`.
        const form = target.closest('form[action$="/star"]');
        const action = form?.getAttribute('action');

        if (action == null || target.closest('button') === null) {
            return null;
        }

        return {
            url: `${page.origin}${new URL(action, page.origin).pathname.replace(/\/star$/, '')}`,
        };
    },
};

const x: Platform = {
    id: 'x',
    label: 'X',
    action: 'Bookmark a post',
    hosts: ['x.com'],
    saved(target, page) {
        // The undo is `removeBookmark`.
        const control = target.closest('[data-testid="bookmark"]');

        if (control === null) {
            return null;
        }

        // On the timeline the post is the article around the button, and its time links to it.
        const post = control.closest('article');
        const link =
            post?.querySelector('a[href*="/status/"] time')?.closest('a') ??
            null;
        const match = /^\/([^/]+)\/status\/(\d+)/.exec(
            link?.getAttribute('href') ?? page.pathname,
        );

        if (match === null) {
            return null;
        }

        const text = post
            ?.querySelector('[data-testid="tweetText"]')
            ?.textContent?.trim();
        const by = `@${match[1]} on X`;

        return {
            url: `${page.origin}/${match[1]}/status/${match[2]}`,
            title: text ? `${by}: ${text.slice(0, 100)}` : by,
            ...(text ? { text } : {}),
        };
    },
};

const youtube: Platform = {
    id: 'youtube',
    label: 'YouTube',
    action: 'Save a video',
    hosts: ['www.youtube.com'],
    saved(target, page) {
        // A playlist ticked in the Save popup, read before the page ticks it.
        const row = target.closest(
            'ytd-playlist-add-to-option-renderer, yt-list-item-view-model',
        );
        const box = row?.querySelector('[role="checkbox"], #checkbox');

        if (box?.getAttribute('aria-checked') !== 'false') {
            return null;
        }

        const id =
            page.pathname === '/watch'
                ? new URLSearchParams(page.search).get('v')
                : /^\/shorts\/([\w-]+)/.exec(page.pathname)?.[1];

        if (id == null || id === '') {
            return null;
        }

        return {
            url: `${page.origin}/watch?v=${encodeURIComponent(id)}`,
            title: target.ownerDocument.title.replace(/ - YouTube$/, ''),
        };
    },
};

export const PLATFORMS: Platform[] = [github, x, youtube];

/** The match patterns of a site: what the browser is asked to allow, and where the page script runs. */
export function originsOf(platform: Platform): string[] {
    return platform.hosts.map((host) => `https://${host}/*`);
}

export function platformForHost(host: string): Platform | null {
    return PLATFORMS.find((platform) => platform.hosts.includes(host)) ?? null;
}

/**
 * Reports what the person saves on a page. A click the page made by itself (`isTrusted` is false) does not
 * count, so a page cannot fill the person's stashes by pressing its own buttons. Returns the way to stop.
 */
export function watchSaves(
    doc: Document,
    platform: Platform,
    onSave: (item: SavedItem) => void,
): () => void {
    // The capture phase runs before the page's own handlers, which is why the control still shows its old state.
    const listener = (event: Event): void => {
        if (!event.isTrusted || !(event.target instanceof Element)) {
            return;
        }

        const item = platform.saved(event.target, doc.location);

        if (item !== null) {
            onSave(item);
        }
    };

    doc.addEventListener('click', listener, true);

    return () => doc.removeEventListener('click', listener, true);
}
