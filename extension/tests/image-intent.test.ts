import { describe, expect, it } from 'vitest';
import {
    decideImage,
    isBiggest,
    jsonLdImages,
    leadsTo,
    parseSrcset,
    sameImage,
    sourceOf,
    titleOf,
    type ClickedImage,
    type ImageSituation,
} from '../lib/image-intent';

const PAGE = 'https://shop.example/products/skillet';
const PHOTO = 'https://cdn.shop.example/files/skillet.jpg';

/** A picture that is on a product page, shown big, the one the page names. */
function image(overrides: Partial<ClickedImage> = {}): ClickedImage {
    return {
        addresses: [`${PHOTO}?width=1600`, `${PHOTO}?width=800`],
        alt: null,
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

function situation(
    overrides: Partial<ImageSituation> = {},
    picture: Partial<ClickedImage> | null = {},
): ImageSituation {
    return {
        page: PAGE,
        clicked: `${PHOTO}?width=800`,
        inPage: true,
        image: picture === null ? null : image(picture),
        ...overrides,
    };
}

describe('the same picture', () => {
    it.each([
        [
            'a Shopify size and cache buster',
            'https://cdn.shop.example/files/pan.jpg?v=1691&width=1200',
            'https://cdn.shop.example/files/pan_533x.jpg?v=1700',
        ],
        [
            'a Shopify named size',
            'https://shop.example/cdn/pan_grande.jpg?v=1',
            'https://shop.example/cdn/pan.jpg',
        ],
        [
            'a WordPress size and its scaled copy',
            'https://blog.example/wp-content/uploads/2026/05/cat-768x512.jpg',
            'https://blog.example/wp-content/uploads/2026/05/cat-scaled.jpg',
        ],
        [
            'an Amazon size mark',
            'https://m.media-amazon.com/images/I/81abc._AC_SL1500_.jpg',
            'https://m.media-amazon.com/images/I/81abc._AC_US40_.jpg',
        ],
        [
            'a Cloudinary transformation and version',
            'https://res.cloudinary.com/demo/image/upload/w_300,h_200,c_fill/v1581234567/sample.jpg',
            'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        ],
        [
            'imgix parameters',
            'https://images.example.net/pan.jpg?w=300&dpr=2&auto=format',
            'https://images.example.net/pan.jpg?q=80&w=1200',
        ],
        [
            'a preset and a density',
            'https://img.example/pan.jpg?preset=large&dpr=2',
            'https://img.example/pan.jpg',
        ],
        [
            'a retina name',
            'https://img.example/pan@2x.jpg',
            'https://img.example/pan.jpg',
        ],
        [
            'another scheme, www., file type and fragment',
            'http://www.img.example/pan.webp#top',
            'https://img.example/pan.jpg',
        ],
        [
            'the other order of the same parameters',
            'https://img.example/p.php?id=7&lang=en',
            'https://img.example/p.php?lang=en&id=7&w=300',
        ],
    ])('is the same across %s', (_, a, b) => {
        expect(sameImage(a, b)).toBe(true);
        expect(sameImage(b, a)).toBe(true);
    });

    it.each([
        [
            'another file',
            'https://img.example/pan.jpg',
            'https://img.example/pot.jpg',
        ],
        [
            'another number in the name',
            'https://img.example/pan-1.jpg',
            'https://img.example/pan-2.jpg',
        ],
        [
            'another picture of a script',
            'https://img.example/photo.php?id=1',
            'https://img.example/photo.php?id=2',
        ],
        [
            'another folder',
            'https://img.example/a/pan.jpg',
            'https://img.example/b/pan.jpg',
        ],
        [
            'another host',
            'https://img.example/pan.jpg',
            'https://other.example/pan.jpg',
        ],
        [
            'an inline picture',
            'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
            'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
        ],
    ])('is not the same across %s', (_, a, b) => {
        expect(sameImage(a, b)).toBe(false);
    });
});

describe('the srcset of a picture', () => {
    it('lists the candidates with their descriptors', () => {
        expect(parseSrcset('a.jpg 480w, b.jpg 800w,c.jpg 1600w')).toEqual([
            { url: 'a.jpg', width: 480, density: null },
            { url: 'b.jpg', width: 800, density: null },
            { url: 'c.jpg', width: 1600, density: null },
        ]);
        expect(parseSrcset('a.jpg, b.jpg 2x')).toEqual([
            { url: 'a.jpg', width: null, density: null },
            { url: 'b.jpg', width: null, density: 2 },
        ]);
    });

    it('keeps a comma inside an address', () => {
        expect(
            parseSrcset(
                '/u/w_300,h_200/x.jpg 300w, /u/w_600,h_400/x.jpg 600w',
            ).map((candidate) => candidate.url),
        ).toEqual(['/u/w_300,h_200/x.jpg', '/u/w_600,h_400/x.jpg']);
    });

    it('is empty for nothing', () => {
        expect(parseSrcset('')).toEqual([]);
        expect(parseSrcset(' , ')).toEqual([]);
    });
});

describe('the biggest picture', () => {
    it('is a big one that beats the next by a quarter', () => {
        expect(
            isBiggest({ width: 500, height: 500 }, { width: 400, height: 300 }),
        ).toBe(true);
        expect(isBiggest({ width: 500, height: 500 }, null)).toBe(true);
    });

    it('is not one that only ties or wins narrowly', () => {
        expect(
            isBiggest({ width: 500, height: 500 }, { width: 500, height: 500 }),
        ).toBe(false);
        expect(
            isBiggest({ width: 500, height: 500 }, { width: 480, height: 480 }),
        ).toBe(false);
    });

    it('is not a small one, however alone', () => {
        expect(isBiggest({ width: 199, height: 600 }, null)).toBe(false);
        expect(isBiggest({ width: 600, height: 120 }, null)).toBe(false);
    });
});

describe('a link around a picture', () => {
    it('leads to another page', () => {
        expect(leadsTo('https://shop.example/products/pot', PAGE)).toBe(
            'https://shop.example/products/pot',
        );
    });

    it.each([
        ['nowhere', null],
        ['the page itself', `${PAGE}#reviews`],
        ['the page itself with tracking', `${PAGE}?utm_source=x`],
        ['a larger view', 'https://shop.example/media/skillet-large.JPG?x=1'],
        ['a mail address', 'mailto:hi@shop.example'],
        ['a script', 'javascript:void(0)'],
    ])('does not lead to another page when it goes to %s', (_, link) => {
        expect(leadsTo(link, PAGE)).toBeNull();
    });
});

describe('the title of a picture', () => {
    it('is the alt text, else the caption, else the title attribute', () => {
        expect(
            titleOf({ alt: 'A skillet', caption: 'Cap', title: 'Tip' }),
        ).toBe('A skillet');
        expect(titleOf({ alt: '', caption: 'The caption', title: 'Tip' })).toBe(
            'The caption',
        );
        expect(titleOf({ alt: null, caption: null, title: 'The tip' })).toBe(
            'The tip',
        );
    });

    it('skips words that say nothing', () => {
        expect(
            titleOf({
                alt: 'IMG_0042.jpg',
                caption: 'image 3',
                title: 'Seared steak',
            }),
        ).toBe('Seared steak');
        expect(
            titleOf({
                alt: 'photo',
                caption: 'https://x.example/a',
                title: '',
            }),
        ).toBeNull();
        expect(titleOf(null)).toBeNull();
    });

    it('is one line of at most 200 characters', () => {
        expect(
            titleOf({
                alt: '  A   cast\n iron   pan ',
                caption: null,
                title: null,
            }),
        ).toBe('A cast iron pan');

        const long = titleOf({
            alt: 'word '.repeat(100),
            caption: null,
            title: null,
        });

        expect(long).toHaveLength(200);
        expect(long?.endsWith('…')).toBe(true);
    });
});

describe('the source of a picture', () => {
    it('is the page it is on', () => {
        expect(sourceOf(null, PAGE)).toBe(PAGE);
        expect(sourceOf(`${PAGE}#top`, PAGE)).toBe(PAGE);
    });

    it('is the page its link leads to, when it is another page', () => {
        expect(sourceOf('https://shop.example/products/pot', PAGE)).toBe(
            'https://shop.example/products/pot',
        );
    });

    it('is nothing for a page that is not on the web', () => {
        expect(sourceOf(null, 'file:///tmp/a.html')).toBeNull();
    });

    it('is nothing when the address is longer than the API takes', () => {
        expect(
            sourceOf(null, `https://shop.example/${'a'.repeat(2100)}`),
        ).toBeNull();
    });
});

describe('what a right-click on a picture saves', () => {
    it('is the page when the page names the picture, at another size', () => {
        const intent = decideImage(situation());

        expect(intent).toMatchObject({ kind: 'page', reason: 'named' });
        // The largest address the page offers first, then what the browser reported.
        expect(intent.addresses).toEqual([
            `${PHOTO}?width=1600`,
            `${PHOTO}?width=800`,
        ]);
    });

    it('is the page when the picture is the biggest on screen', () => {
        expect(
            decideImage(
                situation(
                    {},
                    { named: [], rival: { width: 300, height: 200 } },
                ),
            ),
        ).toMatchObject({ kind: 'page', reason: 'biggest' });
    });

    it('is the page when the biggest picture is wrapped in a link to a larger view or to the page itself', () => {
        for (const link of [`${PHOTO}`, `${PAGE}#gallery`]) {
            expect(
                decideImage(situation({}, { named: [], link })),
            ).toMatchObject({ kind: 'page', reason: 'biggest' });
        }
    });

    it('is the picture when it is the biggest but leads to another page: that is its teaser', () => {
        expect(
            decideImage(
                situation(
                    {},
                    {
                        named: [],
                        link: 'https://shop.example/products/pot',
                        alt: 'A pot',
                    },
                ),
            ),
        ).toEqual({
            kind: 'image',
            addresses: [`${PHOTO}?width=1600`, `${PHOTO}?width=800`],
            title: 'A pot',
            source: 'https://shop.example/products/pot',
        });
    });

    it('is the picture when another one is as big (a gallery) and the page does not name it', () => {
        expect(
            decideImage(
                situation(
                    {},
                    { named: [], rival: { width: 600, height: 600 } },
                ),
            ),
        ).toMatchObject({ kind: 'image', source: PAGE });
    });

    it('is the picture when it is small, whatever the page names', () => {
        expect(
            decideImage(situation({}, { size: { width: 60, height: 60 } })),
        ).toMatchObject({ kind: 'image' });
    });

    it('is the picture when it sits in the navigation, a sidebar or the footer', () => {
        expect(decideImage(situation({}, { inChrome: true }))).toMatchObject({
            kind: 'image',
        });
    });

    it('is the picture when it is not shown', () => {
        expect(decideImage(situation({}, { size: null }))).toMatchObject({
            kind: 'image',
        });
    });

    it('is the picture when it is inside a frame, even one the page names', () => {
        expect(decideImage(situation({ inPage: false }))).toMatchObject({
            kind: 'image',
            source: PAGE,
        });
    });

    it('is the picture when the tab is not a web page', () => {
        expect(
            decideImage(situation({ page: 'file:///tmp/shop.html' })),
        ).toMatchObject({ kind: 'image', source: null });
    });

    it('is the picture, with no source, when the tab shows the picture file itself', () => {
        for (const page of [
            `${PHOTO}?width=800`,
            'https://shop.example/media/skillet-large.PNG',
        ]) {
            expect(
                decideImage(situation({ page, clicked: `${PHOTO}?width=800` })),
            ).toMatchObject({ kind: 'image', source: null });
        }
    });

    it('is the picture, with the page as its source, when the page could not be asked', () => {
        expect(decideImage(situation({}, null))).toEqual({
            kind: 'image',
            addresses: [`${PHOTO}?width=800`],
            title: null,
            source: PAGE,
        });
    });

    it('takes the title from the alt text, the caption or the title attribute of a plain picture', () => {
        expect(
            decideImage(
                situation(
                    {},
                    {
                        named: [],
                        rival: { width: 900, height: 900 },
                        alt: '',
                        caption: 'Seared steak, 3 minutes a side',
                    },
                ),
            ),
        ).toMatchObject({
            kind: 'image',
            title: 'Seared steak, 3 minutes a side',
        });
    });
});

describe('the pictures a page names in its JSON-LD', () => {
    it('are the images of a product, as strings or objects', () => {
        expect(
            jsonLdImages([
                {
                    '@context': 'https://schema.org',
                    '@type': 'Product',
                    image: [
                        'https://cdn.shop.example/a.jpg',
                        {
                            '@type': 'ImageObject',
                            url: 'https://cdn.shop.example/b.jpg',
                        },
                    ],
                },
            ]),
        ).toEqual([
            'https://cdn.shop.example/a.jpg',
            'https://cdn.shop.example/b.jpg',
        ]);
    });

    it('follow a reference to an image of the same graph and leave the site itself alone', () => {
        expect(
            jsonLdImages([
                {
                    '@graph': [
                        {
                            '@type': 'Organization',
                            '@id': '#org',
                            logo: 'https://shop.example/logo.png',
                            image: { '@id': '#logo' },
                        },
                        {
                            '@type': 'ImageObject',
                            '@id': '#logo',
                            url: 'https://shop.example/logo.png',
                        },
                        {
                            '@type': 'ImageObject',
                            '@id': '#hero',
                            url: 'https://shop.example/hero.jpg',
                        },
                        {
                            '@type': 'WebSite',
                            image: 'https://shop.example/site.png',
                        },
                        {
                            '@type': ['WebPage', 'ItemPage'],
                            primaryImageOfPage: { '@id': '#hero' },
                        },
                    ],
                },
            ]),
        ).toEqual(['https://shop.example/hero.jpg']);
    });

    it('survive nonsense', () => {
        expect(
            jsonLdImages([
                null,
                'text',
                3,
                [],
                { '@graph': 'x' },
                { image: 4 },
            ]),
        ).toEqual([]);
    });
});
