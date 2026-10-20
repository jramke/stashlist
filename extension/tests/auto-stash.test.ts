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
    // Any click that is not on a menu ends what YouTube remembered about one.
    platform('youtube').saved(document.body, {
        origin: '',
        pathname: '',
        search: '',
    });
    document.body.innerHTML = '';
    document.title = '';
});

// The markup of each site as the rules were written against it: copied from the pages (buttons and what the
// rules read around them), icons shortened where no rule looks at them.
describe('GitHub', () => {
    const repo = {
        origin: 'https://github.com',
        pathname: '/konradmichalik/typo3-ai-mate',
        search: '',
    };

    it('stashes the repository of the star button on its page', () => {
        load(`<ul><li><div><button data-component="Button" type="button" data-testid="star-button"
            aria-label="Star konradmichalik/typo3-ai-mate"><span><svg class="octicon octicon-star"><path d="M8 .25"/></svg>
            <span><span>Star</span><span><span>3</span></span></span></span></button></div></li></ul>`);

        expect(
            press('[data-testid="star-button"] svg', repo, 'github'),
        ).toEqual({ url: 'https://github.com/konradmichalik/typo3-ai-mate' });
    });

    it('ignores the star button of a repository that is starred', () => {
        load(`<button type="button" data-testid="star-button" aria-label="Unstar konradmichalik/typo3-ai-mate">
            <span>Starred</span></button>`);

        expect(press('button', repo, 'github')).toBeNull();
    });

    // The form around the button was not part of the copied markup: its action is the one every star form on
    // GitHub has.
    const listed = `<article><div><h2><a href="/konradmichalik/typo3-ai-mate">typo3-ai-mate</a></h2>
        <form class="js-social-form" action="/konradmichalik/typo3-ai-mate/star" method="post">
            <button data-ga-click="Repository, click star button, action:explore#index; text:Star"
                data-aria-prefix="Star this repository" aria-label="Star this repository (102)" type="submit"
                class="js-toggler-target btn-sm btn BtnGroup-item"><svg class="octicon octicon-star"><path d="M8 .25"/></svg>
                <span class="d-inline">Star</span> <span class="Counter js-social-count">102</span></button>
        </form>
        <form class="js-social-form" action="/other/repo/unstar" method="post">
            <button aria-label="Unstar this repository (5)" type="submit">Starred</button>
        </form></div></article>`;

    it('stashes the repository starred from a list, not the page it is on', () => {
        load(listed);

        expect(
            press(
                '.js-social-count',
                { ...repo, pathname: '/explore' },
                'github',
            ),
        ).toEqual({ url: 'https://github.com/konradmichalik/typo3-ai-mate' });
    });

    it('ignores the button that undoes the star in a list', () => {
        load(listed);

        expect(press('[action$="/unstar"] button', repo, 'github')).toBeNull();
    });
});

describe('X', () => {
    const home = { origin: 'https://x.com', pathname: '/home', search: '' };
    // The buttons are the ones copied from the feed, a post's own page and an answer; the rest of the post is the
    // markup X has had for years (an article, a time that links to the post, the text).
    const BUTTON = (label: string, testid = 'bookmark') =>
        `<button aria-label="${label}" role="button" data-testid="${testid}" type="button"><div dir="ltr"><div>
            <svg viewBox="0 0 24 24" aria-hidden="true"><g><path d="M4 4.5C4 3.12"></path></g></svg></div></div></button>`;
    const post = (button: string) => `
        <article data-testid="tweet">
            <div data-testid="User-Name">Ada <span>@ada</span></div>
            <a href="/ada/status/123"><time datetime="2026-10-20">1h</time></a>
            <div data-testid="tweetText">Hello   there</div>
            <div role="group">${button}</div>
        </article>
        <article data-testid="tweet">
            <a href="/bob/status/456"><time>2h</time></a>
            ${BUTTON('Lesezeichen')}
        </article>`;

    it('stashes the post of the bookmark button with the text the page shows', () => {
        load(post(BUTTON('Lesezeichen')));

        expect(press('article button', home, 'x')).toEqual({
            url: 'https://x.com/ada/status/123',
            title: '@ada on X: Hello   there',
            text: 'Hello   there',
        });
    });

    it('does not depend on the words of the button, only on what it is', () => {
        load(post(BUTTON('103 Lesezeichen. Lesezeichen')));

        expect(press('article svg', home, 'x')).toMatchObject({
            url: 'https://x.com/ada/status/123',
        });
    });

    it('takes the post from the address on its own page', () => {
        load(BUTTON('103 Lesezeichen. Lesezeichen'));

        expect(
            press(
                'button',
                { ...home, pathname: '/ada/status/123/photo/1' },
                'x',
            ),
        ).toEqual({ url: 'https://x.com/ada/status/123', title: '@ada on X' });
    });

    it('ignores removing a bookmark and a button that is on no post', () => {
        load(post(BUTTON('Lesezeichen entfernen', 'removeBookmark')));

        expect(press('[data-testid="removeBookmark"]', home, 'x')).toBeNull();

        load(BUTTON('Lesezeichen'));

        expect(press('button', home, 'x')).toBeNull();
    });
});

describe('YouTube', () => {
    const watch = {
        origin: 'https://www.youtube.com',
        pathname: '/watch',
        search: '?v=abc123&list=PL1&t=9s',
    };
    const feed = { origin: watch.origin, pathname: '/', search: '' };
    // The icons the rules tell apart, as drawn in the menu of a video.
    const ICONS = {
        queue: 'M2 2.864v6.277a.5.5 0 00.748.434L9 6.002 2.748 2.43A.5.5 0 002 2.864Z',
        later: 'M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 2a9 9 0 110 18.001A9 9 0 0112 3Zm0 3a1 1 0 00-1 1v5.565l.485.292 3.33 2Z',
        playlist:
            'M19 2H5a2 2 0 00-2 2v16.887c0 1.266 1.382 2.048 2.469 1.399L12 18.366Z',
        notInterested:
            'M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 2a9 9 0 018.246 12.605L4.755 6.661Z',
    };
    const entry = (icon: string, words: string) => `
        <yt-list-item-view-model role="presentation"><div><div><div aria-hidden="true">
            <span><svg viewBox="0 0 24 24"><path d="${icon}"></path></svg></span></div>
            <button role="menuitem"><div><div><span role="text">${words}</span></div></div></button></div></div>
        </yt-list-item-view-model>`;
    const menu = `<ytd-popup-container><yt-list-view-model role="menu">
        ${entry(ICONS.queue, 'In die Wiedergabeliste')}
        ${entry(ICONS.later, 'Zu „Später ansehen“ hinzufügen')}
        ${entry(ICONS.playlist, 'Zu Playlist hinzufügen')}
        ${entry(ICONS.notInterested, 'Kein Interesse')}
    </yt-list-view-model></ytd-popup-container>`;
    const opener = (video: string) => `
        <div class="ytLockupMetadataViewModelMenuButton" data-video="${video}"><button-view-model>
            <button aria-label="Mehr Aktionen"><span><svg viewBox="0 0 24 24"><path d="M12 4a2 2 0 100 4"></path></svg></span></button>
        </button-view-model></div>`;
    // The video around a menu button is not part of the copied markup: a box with the links to one video.
    const lockup = (video: string) => `
        <yt-lockup-view-model><a href="/watch?v=${video}&pp=abc"><img alt=""></a>
            <div><a href="/watch?v=${video}&pp=abc">A title</a>${opener(video)}</div></yt-lockup-view-model>`;

    it('stashes the video when Save under it is pressed, before any playlist is chosen', () => {
        document.title = 'A talk - YouTube';
        load(`<div id="flexible-item-buttons"><yt-button-view-model><button-view-model>
            <button aria-label="Zu Playlist hinzufügen" aria-disabled="false"><div aria-hidden="true"><span><svg viewBox="0 0 24 24">
            <path d="${ICONS.playlist}"></path></svg></span></div><div>Speichern</div></button></button-view-model></yt-button-view-model>
            <button aria-label="Teilen"><svg><path d="M10 3.158V7.51"></path></svg></button></div>`);

        expect(press('button svg', watch, 'youtube')).toEqual({
            url: 'https://www.youtube.com/watch?v=abc123',
            title: 'A talk',
        });
        expect(
            press('[aria-label="Teilen"] path', watch, 'youtube'),
        ).toBeNull();
    });

    it('stashes the video of the menu in a list when it is saved from there', () => {
        load(`<div>${lockup('vid1')}${lockup('vid2')}</div>${menu}`);

        // Several lockups stand side by side: the menu belongs to the one whose button was pressed.
        expect(press('[data-video="vid2"] button', feed, 'youtube')).toBeNull();
        expect(
            press(
                '[role="menu"] > :nth-child(3) span[role="text"]',
                feed,
                'youtube',
            ),
        ).toEqual({ url: 'https://www.youtube.com/watch?v=vid2' });

        press('[data-video="vid1"] button', feed, 'youtube');

        expect(
            press('[role="menu"] > :nth-child(2) button', feed, 'youtube'),
        ).toEqual({ url: 'https://www.youtube.com/watch?v=vid1' });
    });

    it('ignores the other entries of the menu, and an entry once the menu is gone', () => {
        load(`${lockup('vid1')}${menu}`);

        press('[data-video] button', feed, 'youtube');

        expect(
            press('[role="menu"] > :nth-child(1) button', feed, 'youtube'),
        ).toBeNull();

        press('[data-video] button', feed, 'youtube');

        expect(
            press('[role="menu"] > :nth-child(4) button', feed, 'youtube'),
        ).toBeNull();

        press('[data-video] button', feed, 'youtube');
        press('a', feed, 'youtube');

        expect(
            press('[role="menu"] > :nth-child(2) button', feed, 'youtube'),
        ).toBeNull();
    });

    it('has nothing to stash when the menu belongs to no single video', () => {
        load(
            `<section>${lockup('vid1')}${lockup('vid2')}${lockup('vid3')}</section>${menu}`,
        );
        // A box without a link to its video: the nearest box that has any holds two other videos.
        document
            .querySelectorAll('yt-lockup-view-model:first-child a')
            .forEach((link) => link.remove());

        press('[data-video="vid1"] button', feed, 'youtube');

        expect(
            press('[role="menu"] > :nth-child(3) button', feed, 'youtube'),
        ).toBeNull();
    });

    it('takes the video of the page for a menu that came from it', () => {
        load(menu);

        expect(
            press('[role="menu"] > :nth-child(3) button', watch, 'youtube'),
        ).toMatchObject({
            url: 'https://www.youtube.com/watch?v=abc123',
        });
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
