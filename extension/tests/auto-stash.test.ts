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

    // A card of the explore page: both forms are in the markup and one is hidden, each with its own button for
    // the lists of stars next to it.
    const listed = `<article class="border rounded">
        <h3 class="f3"><a href="/in2code-de" class="Link">in2code-de</a> /
            <a href="/in2code-de/powermail" class="Link text-bold">powermail</a></h3>
        <div class="js-toggler-container js-social-container starring-container d-flex">
            <div class="starred BtnGroup">
                <form class="js-social-form" data-turbo="false" action="/in2code-de/powermail/unstar" method="post">
                    <input type="hidden" name="context" value="other">
                    <button data-ga-click="Repository, click unstar button, action:explore#index; text:Unstar"
                        aria-label="Starred, click to unstar this repository (102)" type="submit" class="btn-sm btn BtnGroup-item">
                        <svg class="octicon octicon-star-fill"><path d="M8 .25"/></svg><span class="d-inline">Starred</span>
                        <span id="repo-stars-counter-unstar" class="Counter js-social-count">102</span></button>
                </form>
                <user-list-menu><select-panel><dialog-helper>
                    <button id="details-user-list-68707214-starred-button" aria-haspopup="dialog" type="button"><svg><path d="m4.427 7.427"/></svg></button>
                </dialog-helper></select-panel></user-list-menu>
            </div>
            <div class="unstarred BtnGroup">
                <form class="js-social-form" data-turbo="false" action="/in2code-de/powermail/star" method="post">
                    <input type="hidden" name="context" value="other">
                    <button data-ga-click="Repository, click star button, action:explore#index; text:Star"
                        data-aria-prefix="Star this repository" aria-label="Star this repository (102)" type="submit"
                        class="js-toggler-target btn-sm btn BtnGroup-item">
                        <svg class="octicon octicon-star"><path d="M8 .25"/></svg><span class="d-inline">Star</span>
                        <span id="repo-stars-counter-star" class="Counter js-social-count">102</span></button>
                </form>
                <user-list-menu><select-panel><dialog-helper>
                    <button id="details-user-list-68707214-unstarred-button" aria-haspopup="dialog" type="button"><svg><path d="m4.427 7.427"/></svg></button>
                </dialog-helper></select-panel></user-list-menu>
            </div>
        </div>
        <a href="/topics/typo3" class="topic-tag">typo3</a></article>`;
    const explore = { ...repo, pathname: '/explore' };

    it('stashes the repository starred from a list, not the page it is on', () => {
        load(listed);

        expect(press('#repo-stars-counter-star', explore, 'github')).toEqual({
            url: 'https://github.com/in2code-de/powermail',
        });
    });

    it('ignores the button that undoes the star in a list, the buttons for lists and the links of the card', () => {
        load(listed);

        expect(press('.starred form button', explore, 'github')).toBeNull();
        expect(
            press(
                '#details-user-list-68707214-unstarred-button svg',
                explore,
                'github',
            ),
        ).toBeNull();
        expect(press('.topic-tag', explore, 'github')).toBeNull();
        expect(press('h3 a', explore, 'github')).toBeNull();
    });
});

describe('X', () => {
    const home = { origin: 'https://x.com', pathname: '/home', search: '' };
    const BUTTON = (label: string, testid = 'bookmark') =>
        `<button aria-label="${label}" role="button" data-testid="${testid}" type="button"><div dir="ltr"><div>
            <svg viewBox="0 0 24 24" aria-hidden="true"><g><path d="M4 4.5C4 3.12"></path></g></svg></div></div></button>`;
    const POEM = `<div dir="auto" lang="en" data-testid="tweetText"><span>Tabs [wip for </span><a dir="ltr"
        href="https://t.co/fNgOi2HoCx" target="_blank" role="link"><span aria-hidden="true">https://</span>gems.design</a><span>]</span></div>`;
    const VIDEO = (
        id: string,
    ) => `<div data-testid="tweetPhoto"><div data-testid="placementTracking"><div data-testid="videoPlayer">
        <div data-testid="videoComponent"><video preload="none" aria-label="Eingebettetes Video" playsinline
        poster="https://pbs.twimg.com/amplify_video_thumb/${id}/img/poster.jpg" src="blob:https://x.com/6ba0ca19"></video></div></div></div></div>`;
    // A post of the timeline, as X draws it: avatar, name, handle and time (the time is the link to the post),
    // the buttons of the post, the text and the media, the row with the counts and the bookmark button.
    const post = (
        handle: string,
        id: string,
        parts: { text?: string; media?: string; bookmark?: string } = {},
    ) => `
        <article role="article" tabindex="0" data-testid="tweet">
            <div data-testid="Tweet-User-Avatar"><a href="/${handle}" aria-hidden="true" role="link" tabindex="-1">
                <img alt="" draggable="true" src="https://pbs.twimg.com/profile_images/1/a_normal.jpg"></a></div>
            <div data-testid="User-Name">
                <a href="/${handle}" role="link"><span>Name</span><svg aria-label="Verifizierter Account" data-testid="icon-verified"><g><path d="M20.396 11"></path></g></svg></a>
                <a href="/${handle}" role="link" tabindex="-1"><span>@${handle}</span></a><span aria-hidden="true">·</span>
                <a href="/${handle}/status/${id}" dir="ltr" aria-label="vor 4 Stunden" role="link"><time datetime="2026-10-20T13:14:35.000Z">4 Std.</time></a>
            </div>
            <button aria-label="Grok-Aktionen" role="button" type="button"></button>
            <button aria-expanded="false" aria-haspopup="menu" aria-label="Mehr" role="button" data-testid="caret" type="button"></button>
            ${parts.text ?? ''}${parts.media ?? ''}
            <div aria-label="3 Antworten, 88 „Gefällt mir“-Angaben" role="group">
                <button aria-label="3 Antworten." role="button" data-testid="reply" type="button"></button>
                <button aria-label="88 „Gefällt mir“-Angaben." role="button" data-testid="like" type="button"></button>
                <a href="/${handle}/status/${id}/analytics" aria-label="2665 Mal angezeigt" role="link"></a>
                ${parts.bookmark ?? BUTTON('Lesezeichen')}
                <button aria-expanded="false" aria-haspopup="menu" aria-label="Post teilen" role="button" type="button"></button>
            </div>
        </article>`;

    it('stashes the post of the bookmark button with the text and the still of its video', () => {
        load(
            `${post('other', '1')}${post('CJfromJBW', '2112532936847139122', { text: POEM, media: VIDEO('21125') })}`,
        );

        expect(
            press(
                'article:nth-child(2) [data-testid="bookmark"] svg',
                home,
                'x',
            ),
        ).toEqual({
            url: 'https://x.com/CJfromJBW/status/2112532936847139122',
            title: '@CJfromJBW on X: Tabs [wip for https://gems.design]',
            text: 'Tabs [wip for https://gems.design]',
            imageUrl:
                'https://pbs.twimg.com/amplify_video_thumb/21125/img/poster.jpg',
        });
    });

    it('stashes an answer with its text and a post without any text with its picture', () => {
        load(
            `${post('ikramhsakib', '2112569970488156547', { text: '<div data-testid="tweetText"><span>Cool work</span></div>' })}
            ${post('oguzyagizkara', '2112524525917143529', { media: '<div data-testid="tweetPhoto"><img alt="" src="https://pbs.twimg.com/media/Gx.jpg"></div>' })}`,
        );

        expect(
            press(
                'article:nth-child(1) button[data-testid="bookmark"]',
                home,
                'x',
            ),
        ).toEqual({
            url: 'https://x.com/ikramhsakib/status/2112569970488156547',
            title: '@ikramhsakib on X: Cool work',
            text: 'Cool work',
        });
        expect(
            press(
                'article:nth-child(2) button[data-testid="bookmark"]',
                home,
                'x',
            ),
        ).toEqual({
            url: 'https://x.com/oguzyagizkara/status/2112524525917143529',
            title: '@oguzyagizkara on X',
            imageUrl: 'https://pbs.twimg.com/media/Gx.jpg',
        });
    });

    it('does not take the picture of the avatar, and does not depend on the words of the button', () => {
        load(
            post('ada', '123', {
                text: '<div data-testid="tweetText">Hello</div>',
                bookmark: BUTTON('103 Lesezeichen. Lesezeichen'),
            }),
        );

        expect(press('[data-testid="bookmark"] svg', home, 'x')).toEqual({
            url: 'https://x.com/ada/status/123',
            title: '@ada on X: Hello',
            text: 'Hello',
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
        load(
            post('ada', '123', {
                bookmark: BUTTON('Lesezeichen entfernen', 'removeBookmark'),
            }),
        );

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
    // A video of the home feed: the thumbnail and the title link to it, the channel does not, the menu button is last.
    const lockup = (video: string) => `
        <yt-lockup-view-model class="ytd-rich-item-renderer lockup ytLockupViewModelWrapper"><div class="ytLockupViewModelHost">
            <a href="/watch?v=${video}&amp;t=598s" class="ytLockupViewModelContentImage" tabindex="-1" aria-hidden="true">
                <yt-thumbnail-view-model><img alt="" src="https://i.ytimg.com/vi/${video}/hq720.jpg"></yt-thumbnail-view-model></a>
            <div class="ytLockupViewModelMetadata"><yt-lockup-metadata-view-model class="ytLockupMetadataViewModelHost">
                <div class="ytLockupMetadataViewModelAvatar"><yt-avatar-shape><div aria-label="Zu Kanal „DIE ZEIT “" role="button" tabindex="0"></div></yt-avatar-shape></div>
                <div class="ytLockupMetadataViewModelTextContainer"><h3 title="A title"><a href="/watch?v=${video}&amp;t=598s" class="ytLockupMetadataViewModelTitle"><span role="text">A title</span></a></h3>
                    <div class="ytLockupMetadataViewModelMetadata"><a href="/@zeit">DIE ZEIT </a></div></div>
                ${opener(video)}
            </yt-lockup-metadata-view-model></div></div></yt-lockup-view-model>`;

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

    it('keeps a picture that is a web address and drops any other', () => {
        const picture = 'https://pbs.twimg.com/media/Gx.jpg';

        expect(
            readSavedItem({
                type: AUTO_STASH,
                item: { ...item, imageUrl: picture },
            }),
        ).toEqual({ ...item, imageUrl: picture });
        expect(
            readSavedItem({
                type: AUTO_STASH,
                item: { ...item, imageUrl: 'javascript:alert(1)' },
            }),
        ).toEqual(item);
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
