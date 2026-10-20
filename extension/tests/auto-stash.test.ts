import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    AUTO_STASH,
    originsOf,
    platformForHost,
    PLATFORMS,
    watchSaves,
    type Platform,
    type SavedItem,
    type Where,
} from '../lib/auto-stash/platforms';
import { readSavedItem } from '../lib/auto-stash/stash';

function platform(id: Platform['id']): Platform {
    const found = PLATFORMS.find((candidate) => candidate.id === id);

    if (found === undefined) {
        throw new Error(`No platform ${id}`);
    }

    return found;
}

function load(body: string): void {
    document.body.innerHTML = body;
}

function press(
    selector: string,
    page: Where,
    id: Platform['id'],
): SavedItem | null {
    const target = document.querySelector(selector);

    if (target === null) {
        throw new Error(`Nothing matches ${selector}`);
    }

    return platform(id).saved(target, page);
}

afterEach(() => {
    document.body.innerHTML = '';
    document.title = '';
});

// The markup of each site as the rules were written against it.
describe('GitHub', () => {
    const page = {
        origin: 'https://github.com',
        pathname: '/laravel/framework',
        search: '',
    };
    const markup = `
        <div class="starring-container">
            <form class="starred" action="/laravel/framework/unstar" method="post">
                <button aria-label="Unstar this repository">Starred</button>
            </form>
            <form class="unstarred" action="/laravel/framework/star" method="post">
                <button aria-label="Star this repository"><svg><path/></svg> <span>Star</span></button>
            </form>
        </div>`;

    it('stashes the repository when the star button is pressed', () => {
        load(markup);

        expect(press('.unstarred span', page, 'github')).toEqual({
            url: 'https://github.com/laravel/framework',
        });
    });

    it('stashes the repository starred from a list, not the page it is on', () => {
        load(markup);

        expect(
            press(
                '.unstarred button',
                { ...page, pathname: '/trending' },
                'github',
            ),
        ).toEqual({ url: 'https://github.com/laravel/framework' });
    });

    it('ignores the button that undoes the star', () => {
        load(markup);

        expect(press('.starred button', page, 'github')).toBeNull();
    });
});

describe('X', () => {
    const page = { origin: 'https://x.com', pathname: '/home', search: '' };
    const tweet = (testid: string) => `
        <article data-testid="tweet">
            <div data-testid="User-Name">Ada <span>@ada</span></div>
            <a href="/ada/status/123"><time datetime="2026-10-20">1h</time></a>
            <div data-testid="tweetText">Hello   there</div>
            <div role="group">
                <button data-testid="${testid}"><svg/></button>
            </div>
        </article>
        <article data-testid="tweet">
            <a href="/bob/status/456"><time>2h</time></a>
            <button data-testid="bookmark"></button>
        </article>`;

    it('stashes the post of the bookmark button with the text the page shows', () => {
        load(tweet('bookmark'));

        expect(press('article [data-testid="bookmark"]', page, 'x')).toEqual({
            url: 'https://x.com/ada/status/123',
            title: '@ada on X: Hello   there',
            text: 'Hello   there',
        });
    });

    it('takes the post from the address on its own page', () => {
        load('<button data-testid="bookmark"></button>');

        expect(
            press(
                'button',
                { ...page, pathname: '/ada/status/123/photo/1' },
                'x',
            ),
        ).toEqual({ url: 'https://x.com/ada/status/123', title: '@ada on X' });
    });

    it('ignores removing a bookmark and anything that is not a post', () => {
        load(tweet('removeBookmark'));

        expect(press('[data-testid="removeBookmark"]', page, 'x')).toBeNull();

        load('<button data-testid="bookmark"></button>');

        expect(press('button', page, 'x')).toBeNull();
    });
});

describe('YouTube', () => {
    const watch = {
        origin: 'https://www.youtube.com',
        pathname: '/watch',
        search: '?v=abc123&list=PL1&t=9s',
    };
    const row = (checked: boolean) => `
        <ytd-playlist-add-to-option-renderer>
            <tp-yt-paper-checkbox id="checkbox" aria-checked="${checked}"><span id="label">Watch later</span></tp-yt-paper-checkbox>
        </ytd-playlist-add-to-option-renderer>`;

    it('stashes the video when a playlist is ticked', () => {
        document.title = 'A talk - YouTube';
        load(row(false));

        expect(press('#label', watch, 'youtube')).toEqual({
            url: 'https://www.youtube.com/watch?v=abc123',
            title: 'A talk',
        });
    });

    it('knows a short by its address', () => {
        load(row(false));

        expect(
            press(
                '#label',
                { ...watch, pathname: '/shorts/xyz_9-', search: '' },
                'youtube',
            ),
        ).toMatchObject({ url: 'https://www.youtube.com/watch?v=xyz_9-' });
    });

    it('ignores unticking and rows that are no checkbox', () => {
        load(row(true));

        expect(press('#label', watch, 'youtube')).toBeNull();

        load(
            '<yt-list-item-view-model><span>Report</span></yt-list-item-view-model>',
        );

        expect(press('span', watch, 'youtube')).toBeNull();
    });

    it('has nothing to stash away from a video', () => {
        load(row(false));

        expect(
            press(
                '#label',
                { ...watch, pathname: '/feed/history', search: '' },
                'youtube',
            ),
        ).toBeNull();
    });
});

describe('watching a page', () => {
    const github = platform('github');

    function click(target: Element, trusted: boolean): void {
        const event = new MouseEvent('click', { bubbles: true });

        Object.defineProperty(event, 'isTrusted', { value: trusted });
        target.dispatchEvent(event);
    }

    it('reports a click of the person and not one the page made', () => {
        load(`<form action="/o/r/star"><button>Star</button></form>`);
        const seen = vi.fn();
        const stop = watchSaves(document, github, seen);
        const button = document.querySelector('button');

        if (button === null) {
            throw new Error('No button');
        }

        click(button, false);
        expect(seen).not.toHaveBeenCalled();

        click(button, true);
        expect(seen).toHaveBeenCalledOnce();

        stop();
        click(button, true);
        expect(seen).toHaveBeenCalledOnce();
    });
});

describe('sites', () => {
    it('are found by host and asked for as match patterns', () => {
        expect(platformForHost('github.com')?.id).toBe('github');
        expect(platformForHost('example.com')).toBeNull();
        expect(originsOf(platform('youtube'))).toEqual([
            'https://www.youtube.com/*',
        ]);
    });
});

describe('the message to the background', () => {
    const item = { url: 'https://github.com/o/r' };

    it('is read back, kept inside the caps', () => {
        expect(readSavedItem({ type: AUTO_STASH, item })).toEqual(item);
        expect(
            readSavedItem({
                type: AUTO_STASH,
                item: {
                    ...item,
                    title: 't'.repeat(999),
                    text: 'x'.repeat(99_999),
                },
            }),
        ).toEqual({
            ...item,
            title: 't'.repeat(300),
            text: 'x'.repeat(20_000),
        });
    });

    it('is refused when it is not ours or not a web address', () => {
        expect(readSavedItem({ type: 'other', item })).toBeNull();
        expect(
            readSavedItem({
                type: AUTO_STASH,
                item: { url: 'javascript:alert(1)' },
            }),
        ).toBeNull();
        expect(
            readSavedItem({
                type: AUTO_STASH,
                item: { url: 'https://a.test/' + 'a'.repeat(2100) },
            }),
        ).toBeNull();
        expect(readSavedItem('hello')).toBeNull();
        expect(readSavedItem(null)).toBeNull();
    });
});
