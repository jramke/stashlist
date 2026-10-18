import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readClickedImage } from '../lib/image-context';

const PAGE = 'https://shop.example/products/skillet';
const PHOTO = 'https://cdn.shop.example/skillet.jpg';

/** Nothing is laid out here, so an element says how big it is shown in `data-size` ("600x400"). */
beforeEach(() => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
        function (this: Element) {
            const [width = 0, height = 0] = (
                this.getAttribute('data-size') ?? ''
            )
                .split('x')
                .map(Number);

            return {
                width,
                height,
                top: 10,
                left: 10,
                bottom: 10 + height,
                right: 10 + width,
                x: 10,
                y: 10,
                toJSON: () => ({}),
            };
        },
    );
});

afterEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
});

function show(head: string, body: string): void {
    document.head.innerHTML = `<base href="${PAGE}">${head}`;
    document.body.innerHTML = body;
}

function read(clicked: string) {
    return readClickedImage(document, window, clicked);
}

const PRODUCT_HEAD = `
    <meta property="og:image" content="${PHOTO}?width=1200">
    <meta name="twitter:image" content="/cards/skillet.png">
    <link rel="image_src" href="//cdn.shop.example/legacy.jpg">
    <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Product","name":"Skillet","image":["${PHOTO}?width=1800"]}
    </script>
    <script type="application/ld+json">this is not json</script>`;

describe('reading the picture that was clicked', () => {
    it('finds it by any address it goes by and lists them largest first', () => {
        show(
            PRODUCT_HEAD,
            `<main>
                <img id="big" data-size="600x600" src="${PHOTO}?width=533"
                     srcset="${PHOTO}?width=533 533w, ${PHOTO}?width=1066 1066w, ${PHOTO}?width=2132 2132w">
                <img data-size="80x80" src="https://cdn.shop.example/thumb.jpg">
            </main>`,
        );

        const found = read(`${PHOTO}?width=1066`);

        expect(found?.addresses).toEqual([
            `${PHOTO}?width=2132`,
            `${PHOTO}?width=1066`,
            `${PHOTO}?width=533`,
        ]);
        expect(found).toMatchObject({
            size: { width: 600, height: 600 },
            inChrome: false,
            rival: { width: 80, height: 80 },
            link: null,
        });
    });

    it('reports the pictures the page names, as absolute addresses', () => {
        show(PRODUCT_HEAD, `<img data-size="600x600" src="${PHOTO}">`);

        expect(read(PHOTO)?.named).toEqual([
            `${PHOTO}?width=1200`,
            'https://shop.example/cards/skillet.png',
            'https://cdn.shop.example/legacy.jpg',
            `${PHOTO}?width=1800`,
        ]);
    });

    it('reads the words and the link around it', () => {
        show(
            '',
            `<figure>
                <a href="/products/pot#reviews">
                    <img data-size="300x300" src="${PHOTO}" alt="  A cast
                        iron skillet " title="Click to enlarge">
                </a>
                <figcaption>Seasoned   twice,
                    then oiled</figcaption>
            </figure>`,
        );

        expect(read(PHOTO)).toMatchObject({
            alt: 'A cast iron skillet',
            title: 'Click to enlarge',
            caption: 'Seasoned twice, then oiled',
            link: 'https://shop.example/products/pot#reviews',
        });
    });

    it('takes the density of a srcset as that many times the width it is shown at', () => {
        show(
            '',
            `<img data-size="300x300" src="https://x.example/a.jpg"
                 srcset="https://x.example/a.jpg 1x, https://x.example/b.jpg 2x, https://x.example/c.jpg 3x">`,
        );

        expect(read('https://x.example/a.jpg')?.addresses).toEqual([
            'https://x.example/c.jpg',
            'https://x.example/b.jpg',
            'https://x.example/a.jpg',
        ]);
    });

    it('uses the sources of a picture that match the screen, and a lazy loader’s data-src', () => {
        show(
            '',
            `<picture>
                <source media="(min-width: 99999px)" srcset="https://x.example/never.webp 9000w">
                <source type="image/svg+xml" srcset="https://x.example/vector.svg 8000w">
                <source srcset="https://x.example/wide.webp 1600w">
                <img data-size="400x300" src="https://x.example/small.jpg" data-src="https://x.example/lazy.jpg">
            </picture>`,
        );

        expect(read('https://x.example/small.jpg')?.addresses).toEqual([
            'https://x.example/wide.webp',
            'https://x.example/lazy.jpg',
            'https://x.example/small.jpg',
        ]);
    });

    it('finds a picture by the same file at another size when no address is exact', () => {
        show('', `<img data-size="400x400" src="${PHOTO}?width=400">`);

        expect(read(`${PHOTO}?width=1200&dpr=2`)?.addresses).toEqual([
            `${PHOTO}?width=400`,
        ]);
    });

    it('takes the biggest of several elements that show the same picture', () => {
        show(
            '',
            `<img data-size="100x100" src="${PHOTO}" alt="small">
             <img data-size="500x500" src="${PHOTO}" alt="big">`,
        );

        expect(read(PHOTO)).toMatchObject({
            alt: 'big',
            size: { width: 500, height: 500 },
            // The same picture again is no rival.
            rival: null,
        });
    });

    it('knows a picture in the navigation, a sidebar or the footer', () => {
        show(
            '',
            `<nav><img data-size="150x150" src="${PHOTO}"></nav>
             <main><img data-size="600x600" src="https://x.example/other.jpg"></main>`,
        );

        expect(read(PHOTO)).toMatchObject({ inChrome: true });
    });

    it('compares a picture only with those in the same main content that are on screen', () => {
        show(
            '',
            `<header><img data-size="1200x500" src="https://x.example/banner.jpg"></header>
             <main>
                 <img data-size="600x600" src="${PHOTO}">
                 <img data-size="800x800" src="https://x.example/gone.jpg" style="display: none">
                 <img data-size="0x0" src="https://x.example/lazy.jpg">
                 <img data-size="300x200" src="https://x.example/related.jpg">
                 <aside><img data-size="900x900" src="https://x.example/ad.jpg"></aside>
             </main>`,
        );

        expect(read(PHOTO)?.rival).toEqual({ width: 300, height: 200 });
    });

    it('says nothing is shown for a picture that has no size', () => {
        show('', `<img src="${PHOTO}">`);

        expect(read(PHOTO)).toMatchObject({ size: null, rival: null });
    });

    it('finds no picture that is not on the page', () => {
        show('', `<img data-size="600x600" src="${PHOTO}">`);

        expect(read('https://x.example/elsewhere.jpg')).toBeNull();
    });

    it('does not carry a picture’s own bytes in its list of addresses', () => {
        const inline = `data:image/png;base64,${'A'.repeat(5000)}`;
        show('', `<img data-size="600x600" src="${inline}">`);

        expect(read(inline)?.addresses).toEqual([]);
    });
});
