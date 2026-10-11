import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { PageCapture } from '../lib/types';

const page: PageCapture = {
    url: 'https://example.com/post',
    title: 'A post',
    description: 'About a post',
    siteName: 'Example',
    author: null,
    published: null,
    language: 'en',
    faviconUrl: null,
    imageUrl: null,
    contentMarkdown: '# A post',
    schemaOrg: [],
};

// The page and the screenshot come from the browser; here they are given.
vi.mock('../lib/page', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../lib/page')>()),
    capturePage: vi.fn(async () => page),
}));
vi.mock('../lib/screenshot', () => ({
    captureScreenshot: vi.fn(
        async () => new Blob(['webp'], { type: 'image/webp' }),
    ),
}));

const { saveSettings } = await import('../lib/settings');
const { NotConfigured, NotStashable, stashTab, stashThing } =
    await import('../lib/stash-tab');

function answer(body: unknown, status = 201): void {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
            new Response(JSON.stringify(body), {
                status,
                headers: { 'Content-Type': 'application/json' },
            }),
        ),
    );
}

const saved = {
    id: 5,
    created: true,
    type: 'link',
    url: page.url,
    title: 'A post',
    tags: ['inbox'],
    web_url: 'https://stashlist.app/stashes/5',
};

describe('stashing with the defaults', () => {
    beforeEach(async () => {
        fakeBrowser.reset();
        // The check for saved pages is off: no `tabs` permission.
        fakeBrowser.permissions.contains = vi.fn(async () => false);
        // The fake browser has no manifest of its own.
        vi.spyOn(fakeBrowser.runtime, 'getManifest').mockReturnValue({
            version: '2.0.0',
        } as never);
        await saveSettings({
            instance: 'https://stashlist.app',
            token: '1|stl_secret',
            defaults: { tags: ['inbox'], collectionIds: [4], screenshot: true },
        });
    });

    it('sends the page with the default tags, collections and a screenshot', async () => {
        answer(saved);

        const result = await stashTab({
            id: 1,
            url: page.url,
            title: page.title,
            windowId: 1,
        });

        const [url, init] = vi.mocked(fetch).mock.calls[0] as [
            string,
            RequestInit,
        ];
        const form = init.body as FormData;

        expect(result.webUrl).toBe('https://stashlist.app/stashes/5');
        expect(url).toBe('https://stashlist.app/api/v1/stashes');
        expect((init.headers as Record<string, string>).Authorization).toBe(
            'Bearer 1|stl_secret',
        );
        expect(form.getAll('tags[]')).toEqual(['inbox']);
        expect(form.getAll('collection_ids[]')).toEqual(['4']);
        expect(form.get('capture[content_markdown]')).toBe('# A post');
        expect(form.get('capture[version]')).toBe('2.0.0');
        expect(form.get('screenshot')).toBeInstanceOf(Blob);
    });

    it('leaves the screenshot out when the options say so, and sends JSON then', async () => {
        await saveSettings({
            instance: 'https://stashlist.app',
            token: '1|stl_secret',
            defaults: { tags: [], collectionIds: [], screenshot: false },
        });
        answer(saved);

        await stashTab({
            id: 1,
            url: page.url,
            title: page.title,
            windowId: 1,
        });

        const [, init] = vi.mocked(fetch).mock.calls[0] as [
            string,
            RequestInit,
        ];

        expect((init.headers as Record<string, string>)['Content-Type']).toBe(
            'application/json',
        );
        expect(JSON.parse(init.body as string)).toMatchObject({
            url: page.url,
            title: 'A post',
            capture: { source: 'extension' },
        });
    });

    it('refuses a page that is not on the web, without calling the server', async () => {
        answer(saved);

        await expect(
            stashTab({ id: 1, url: 'chrome://settings', title: 'Settings' }),
        ).rejects.toBeInstanceOf(NotStashable);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('stashes a link or an image address the person pointed at, with the defaults', async () => {
        answer({ ...saved, type: 'image' });

        await stashThing({ type: 'image', url: 'https://example.com/cat.png' });

        const [, init] = vi.mocked(fetch).mock.calls[0] as [
            string,
            RequestInit,
        ];

        expect(JSON.parse(init.body as string)).toEqual({
            type: 'image',
            url: 'https://example.com/cat.png',
            tags: ['inbox'],
            collection_ids: [4],
        });
    });
});

describe('before the token is set', () => {
    it('says so and does nothing', async () => {
        fakeBrowser.reset();
        answer(saved);

        await expect(stashTab({ id: 1, url: page.url })).rejects.toBeInstanceOf(
            NotConfigured,
        );
        expect(fetch).not.toHaveBeenCalled();
    });
});
