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
        // The page of a repository: one button, labelled "Star <owner>/<repo>" (the one that undoes it says "Unstar").
        const label = target
            .closest('button[data-testid="star-button"]')
            ?.getAttribute('aria-label');
        const repo =
            label == null ? null : /^Star (\S+\/\S+)$/.exec(label)?.[1];

        if (repo != null) {
            return { url: `${page.origin}/${repo}` };
        }

        // Lists (explore, trending, search): a form that posts to `/<owner>/<repo>/star`; the one that undoes it, to `/unstar`.
        const action = target
            .closest('form[action$="/star"]')
            ?.getAttribute('action');

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
        // Opening the menu of a video in a list: the menu is drawn apart from the video, so remember whose it is.
        const opener = target.closest('.ytLockupMetadataViewModelMenuButton');

        if (opener !== null) {
            menuVideo = videoAround(opener);

            return null;
        }

        const remembered = menuVideo;
        menuVideo = null;

        // "Save" under the video: pressing it opens the playlists, and that is already a save.
        const save = target.closest('#flexible-item-buttons button');
        // "Save to playlist" and "Save to Watch later" in the menu of a video, found by their icons: the words change with the language.
        const entry = target.closest('yt-list-item-view-model');
        const id =
            save !== null && hasIcon(save, BOOKMARK)
                ? videoOf(page)
                : entry !== null &&
                    (hasIcon(entry, BOOKMARK) || hasIcon(entry, CLOCK))
                  ? (remembered ?? videoOf(page))
                  : null;

        if (id === null) {
            return null;
        }

        return {
            url: `${page.origin}/watch?v=${encodeURIComponent(id)}`,
            // The title of the tab is the video's only on its own page.
            ...(id === videoOf(page)
                ? {
                      title: target.ownerDocument.title.replace(
                          / - YouTube$/,
                          '',
                      ),
                  }
                : {}),
        };
    },
};

// The paths YouTube draws its icons with, as far as they tell one from the other.
const BOOKMARK = 'M19 2H5a2 2 0 00-2 2v16.887';
const CLOCK =
    'M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 2a9 9 0 110 18.001A9 9 0 0112 3Zm0 3a1 1 0 00-1 1v5.565';

/** The video whose menu was opened last, until the next click. */
let menuVideo: string | null = null;

function hasIcon(within: Element, icon: string): boolean {
    return [...within.querySelectorAll('path')].some((path) =>
        path.getAttribute('d')?.startsWith(icon),
    );
}

/** The id of the video a page or a link is about. */
function videoIn(address: string): string | null {
    const url = new URL(address, 'https://www.youtube.com');

    return (
        (url.pathname === '/watch'
            ? url.searchParams.get('v')
            : /^\/shorts\/([\w-]+)/.exec(url.pathname)?.[1]) || null
    );
}

function videoOf(page: Where): string | null {
    return videoIn(`${page.pathname}${page.search}`);
}

/** The one video in the nearest box around an element that has any link to a video; null when that box has several. */
function videoAround(element: Element): string | null {
    for (
        let box = element.parentElement;
        box !== null;
        box = box.parentElement
    ) {
        const ids = new Set(
            [...box.querySelectorAll('a[href]')]
                .map((link) => videoIn(link.getAttribute('href') ?? ''))
                .filter((id) => id !== null),
        );

        if (ids.size > 0) {
            return ids.size === 1 ? ([...ids][0] ?? null) : null;
        }
    }

    return null;
}

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
