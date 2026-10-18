import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { ClickedImage } from '../lib/image-intent';
import type { PageCapture } from '../lib/types';

const PAGE = 'https://shop.example/products/skillet';
const PHOTO = 'https://cdn.shop.example/skillet.jpg';

const shop: PageCapture = {
    url: PAGE,
    title: 'Cast iron skillet',
    description: 'Pre-seasoned.',
    siteName: 'Hearth & Home',
    author: null,
    published: null,
    language: 'en',
    faviconUrl: null,
    imageUrl: 'https://cdn.shop.example/social-card.jpg',
    contentMarkdown: '# Cast iron skillet',
    schemaOrg: [{ '@type': 'Product', offers: { price: '39.90' } }],
};

// The page and the browser are given; what is under test is what is asked and what is sent.
vi.mock('../lib/page', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../lib/page')>()),
    capturePage: vi.fn(async () => shop),
}));
vi.mock('../lib/screenshot', () => ({
    captureScreenshot: vi.fn(
        async () => new Blob(['webp'], { type: 'image/webp' }),
    ),
}));
vi.mock('../lib/image', () => ({
    lookAtImage: vi.fn(),
    fetchImage: vi.fn(),
}));

const { fetchImage, lookAtImage } = await import('../lib/image');
const { saveSettings } = await import('../lib/settings');
const { NotConfigured, NotStashable } = await import('../lib/stash-tab');
const { stashImage } = await import('../lib/stash-image');

/** The picture of a product page: shown big, named by the page, the only big one. */
function productPhoto(overrides: Partial<ClickedImage> = {}): ClickedImage {
    return {
        addresses: [`${PHOTO}?width=1600`, `${PHOTO}?width=800`],
        alt: 'A cast iron skillet',
        title: null,
        caption: null,
        link: null,
        named: [`${PHOTO}?width=1200`],
        size: { width: 600, height: 600 },
        inChrome: false,
        rival: { width: 80, height: 80 },
        ...overrides,
    };
}

const bytes = new Blob(['jpeg'], { type: 'image/jpeg' });
const tab = { id: 7, url: PAGE, title: 'Skillet', windowId: 1 };
const click = { srcUrl: `${PHOTO}?width=800`, frameId: 0 };

function answer(type: string): void {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    id: 5,
                    created: true,
                    type,
                    url: type === 'link' ? PAGE : null,
                    title: 'Cast iron skillet',
                    tags: ['inbox'],
                    web_url: 'https://stashlist.app/stashes/5',
                }),
                {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        ),
    );
}

/** What was sent, as fields: a form or JSON, whichever the save used. */
function sent(): Record<string, unknown> {
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];

    return init.body instanceof FormData
        ? Object.fromEntries(init.body.entries())
        : (JSON.parse(init.body as string) as Record<string, unknown>);
}

beforeEach(async () => {
    fakeBrowser.reset();
    fakeBrowser.permissions.contains = vi.fn(async () => false);
    vi.spyOn(fakeBrowser.runtime, 'getManifest').mockReturnValue({
        version: '2.0.0',
    } as never);
    vi.mocked(lookAtImage).mockReset();
    vi.mocked(fetchImage).mockReset();
    await saveSettings({
        instance: 'https://stashlist.app',
        token: '1|stl_secret',
        defaults: { tags: ['inbox'], collectionIds: [4], screenshot: true },
    });
});

describe('a right-click on the page’s own picture', () => {
    it('stashes the page with the picture as its picture, the bytes along and no screenshot', async () => {
        vi.mocked(lookAtImage).mockResolvedValue(productPhoto());
        vi.mocked(fetchImage).mockResolvedValue({
            address: `${PHOTO}?width=1600`,
            blob: bytes,
        });
        answer('link');

        const { page, result } = await stashImage(tab, click);

        expect(page).toBe(true);
        expect(result.webUrl).toBe('https://stashlist.app/stashes/5');
        expect(lookAtImage).toHaveBeenCalledWith(7, 0, click.srcUrl);
        expect(fetchImage).toHaveBeenCalledWith(
            7,
            0,
            [`${PHOTO}?width=1600`, `${PHOTO}?width=800`],
            20 * 1024 * 1024,
        );
        expect(sent()).toMatchObject({
            type: 'link',
            url: PAGE,
            title: 'Cast iron skillet',
            'capture[content_markdown]': '# Cast iron skillet',
            // The picture the person pointed at, not the page's social card.
            'capture[image_url]': `${PHOTO}?width=1600`,
            'capture[schema_org][0][@type]': 'Product',
        });
        expect(sent().image).toBeInstanceOf(Blob);
        expect(sent()).not.toHaveProperty('screenshot');
    });

    it('sends the address when the page would not let the bytes be read, and keeps the screenshot as a fallback', async () => {
        vi.mocked(lookAtImage).mockResolvedValue(productPhoto());
        vi.mocked(fetchImage).mockResolvedValue(null);
        answer('link');

        await stashImage(tab, click);

        expect(sent()).toMatchObject({
            type: 'link',
            url: PAGE,
            'capture[image_url]': `${PHOTO}?width=1600`,
        });
        expect(sent()).not.toHaveProperty('image');
        expect(sent().screenshot).toBeInstanceOf(Blob);
    });
});

describe('a right-click on any other picture', () => {
    const photoInArticle = (): ClickedImage =>
        productPhoto({ named: [], rival: { width: 600, height: 600 } });

    it('stashes the picture with the page’s words and the page as its source', async () => {
        vi.mocked(lookAtImage).mockResolvedValue(photoInArticle());
        vi.mocked(fetchImage).mockResolvedValue({
            address: `${PHOTO}?width=1600`,
            blob: bytes,
        });
        answer('image');

        const { page } = await stashImage(tab, click);

        expect(page).toBe(false);
        expect(sent()).toMatchObject({
            type: 'image',
            title: 'A cast iron skillet',
            source_url: PAGE,
            'tags[]': 'inbox',
            'collection_ids[]': '4',
        });
        expect(sent().image).toBeInstanceOf(Blob);
        expect(sent()).not.toHaveProperty('url');
        expect(sent()).not.toHaveProperty('capture[source]');
    });

    it('saves the largest address when the bytes could not be read, for the server to fetch', async () => {
        vi.mocked(lookAtImage).mockResolvedValue(photoInArticle());
        vi.mocked(fetchImage).mockResolvedValue(null);
        answer('image');

        await stashImage(tab, click);

        expect(sent()).toEqual({
            type: 'image',
            url: `${PHOTO}?width=1600`,
            title: 'A cast iron skillet',
            source_url: PAGE,
            tags: ['inbox'],
            collection_ids: [4],
        });
    });

    it('works on a page that could not be asked, as "Stash image" always did', async () => {
        vi.mocked(lookAtImage).mockResolvedValue(null);
        vi.mocked(fetchImage).mockResolvedValue(null);
        answer('image');

        const { page } = await stashImage(tab, click);

        expect(page).toBe(false);
        expect(sent()).toEqual({
            type: 'image',
            url: click.srcUrl,
            source_url: PAGE,
            tags: ['inbox'],
            collection_ids: [4],
        });
    });

    it('asks the frame that was clicked, and a picture in a frame is never the page’s own', async () => {
        vi.mocked(lookAtImage).mockResolvedValue(productPhoto());
        vi.mocked(fetchImage).mockResolvedValue(null);
        answer('image');

        const { page } = await stashImage(tab, { ...click, frameId: 3 });

        expect(page).toBe(false);
        expect(lookAtImage).toHaveBeenCalledWith(7, 3, click.srcUrl);
        expect(fetchImage).toHaveBeenCalledWith(
            7,
            3,
            expect.anything(),
            expect.anything(),
        );
    });

    it('refuses a picture that cannot be read and has no address on the web', async () => {
        vi.mocked(lookAtImage).mockResolvedValue(null);
        vi.mocked(fetchImage).mockResolvedValue(null);
        answer('image');

        await expect(
            stashImage(tab, { srcUrl: 'blob:https://shop.example/1f2e' }),
        ).rejects.toThrow(NotStashable);
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe('before the token is set', () => {
    it('says so before the page is looked at', async () => {
        fakeBrowser.reset();

        await expect(stashImage(tab, click)).rejects.toThrow(NotConfigured);
        expect(lookAtImage).not.toHaveBeenCalled();
    });
});
