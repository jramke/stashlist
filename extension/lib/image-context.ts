import {
    jsonLdImages,
    parseSrcset,
    sameImage,
    type ClickedImage,
    type Size,
} from './image-intent';

/** Where the background leaves the address of the clicked picture for the script (both run in the same isolated world). */
export const CLICKED_KEY = '__stashlistClickedImage';

/** The landmarks whose pictures are decoration or navigation, never the page's own. */
const CHROME =
    'nav, aside, footer, [role="navigation"], [role="complementary"], [role="contentinfo"]';

/** The part of a page that is about something: pictures are compared with the others in it. */
const MAIN = 'main, [role="main"], article';

const NAMED_PICTURES = [
    'meta[property="og:image"]',
    'meta[property="og:image:url"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
    'meta[property="twitter:image"]',
    'meta[itemprop="image"]',
];

/** The most characters of a caption read from the page. */
const CAPTION_LENGTH = 500;

/** The longest inline address kept as a name for the picture: a data address bigger than that is the bytes themselves. */
const INLINE_LENGTH = 2048;

/**
 * Looks at the picture the person right-clicked and at the page around it, in the page itself (the script runs in
 * the frame that was clicked). The browser tells the background only the address of the picture, so the picture
 * is found by the addresses its element goes by (the one it loaded, `src` and every `srcset` candidate); when
 * several elements show it, the biggest one on screen is taken.
 *
 * It only reports what is there: whether that makes the page's own picture is decided by `decideImage`.
 *
 * @returns null when no picture of the page goes by that address (a picture drawn by a script, or one in a shadow root)
 */
export function readClickedImage(
    document: Document,
    window: Window,
    clicked: string,
): ClickedImage | null {
    const base = document.baseURI;
    const element = findImage(document, window, clicked);

    if (element === null) {
        return null;
    }

    const size = shownSize(element, window);
    const addresses = rankedAddresses(element, window, base, size);

    return {
        addresses,
        alt: text(element.getAttribute('alt'), CAPTION_LENGTH),
        title: text(element.getAttribute('title'), CAPTION_LENGTH),
        caption: text(
            element.closest('figure')?.querySelector('figcaption')?.textContent,
            CAPTION_LENGTH,
        ),
        link: absolute(element.closest('a[href]')?.getAttribute('href'), base),
        named: namedPictures(document, base),
        size,
        inChrome: element.closest(CHROME) !== null,
        rival: biggestRival(document, window, element, addresses),
    };
}

function findImage(
    document: Document,
    window: Window,
    clicked: string,
): HTMLImageElement | null {
    const base = document.baseURI;
    const images = Array.from(document.querySelectorAll('img'));
    const exact = images.filter((image) =>
        goesBy(image, window, base).includes(clicked),
    );
    // A different query or size of the same file: the next best thing to the exact address.
    const matches =
        exact.length > 0
            ? exact
            : images.filter((image) =>
                  goesBy(image, window, base).some((address) =>
                      sameImage(address, clicked),
                  ),
              );

    return (
        matches
            .map((image) => ({ image, size: shownSize(image, window) }))
            .filter(
                (entry): entry is { image: HTMLImageElement; size: Size } =>
                    entry.size !== null,
            )
            .sort(
                (a, b) =>
                    b.size.width * b.size.height - a.size.width * a.size.height,
            )[0]?.image ??
        matches[0] ??
        null
    );
}

/** Every address an image element goes by. */
function goesBy(
    image: HTMLImageElement,
    window: Window,
    base: string,
): string[] {
    return [
        absolute(image.currentSrc, base),
        absolute(image.getAttribute('src'), base),
        ...srcsets(image, window).flatMap((set) =>
            parseSrcset(set).map((candidate) => absolute(candidate.url, base)),
        ),
    ].filter((address): address is string => address !== null);
}

/** The `srcset` lists that apply to an image: its own, a lazy loader's, and those of the `<source>`s of its `<picture>` that match the screen. */
function srcsets(image: HTMLImageElement, window: Window): string[] {
    const sources =
        image.parentElement?.tagName === 'PICTURE'
            ? Array.from(image.parentElement.querySelectorAll('source')).filter(
                  (source) =>
                      !(source.getAttribute('type') ?? '').includes('svg') &&
                      window.matchMedia(source.getAttribute('media') || 'all')
                          .matches,
              )
            : [];

    return [
        ...sources.map((source) => source.getAttribute('srcset') ?? ''),
        image.getAttribute('srcset') ?? '',
        image.getAttribute('data-srcset') ?? '',
    ].filter((set) => set !== '');
}

/**
 * The addresses of a picture, the one with the most pixels first: the candidates of its `srcset` (a density
 * counts as that many times the width it is shown at), the address the browser loaded, and a lazy loader's
 * `data-src`.
 */
function rankedAddresses(
    image: HTMLImageElement,
    window: Window,
    base: string,
    size: Size | null,
): string[] {
    const shown = size?.width ?? (image.width || 0);
    const weights = new Map<string, number>();
    const add = (value: string | null | undefined, weight: number): void => {
        const address = absolute(value, base);

        if (
            address !== null &&
            (!address.startsWith('data:') || address.length <= INLINE_LENGTH)
        ) {
            weights.set(address, Math.max(weights.get(address) ?? 0, weight));
        }
    };

    for (const set of srcsets(image, window)) {
        for (const candidate of parseSrcset(set)) {
            add(
                candidate.url,
                candidate.width ?? (candidate.density ?? 1) * shown,
            );
        }
    }

    add(image.currentSrc, image.naturalWidth || 0);
    add(image.getAttribute('data-src'), shown);
    add(image.getAttribute('src'), image.currentSrc ? 0 : shown);

    return Array.from(weights)
        .sort((a, b) => b[1] - a[1])
        .map(([address]) => address);
}

/** The size an element is shown at, or null when it is not shown on screen. */
function shownSize(element: Element, window: Window): Size | null {
    const box = element.getBoundingClientRect();

    if (box.width === 0 || box.height === 0) {
        return null;
    }

    const style = window.getComputedStyle(element);

    if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        parseFloat(style.opacity) === 0 ||
        box.bottom <= 0 ||
        box.right <= 0 ||
        box.top >= window.innerHeight ||
        box.left >= window.innerWidth
    ) {
        return null;
    }

    return { width: Math.round(box.width), height: Math.round(box.height) };
}

/** The biggest other picture on screen in the same main content (not the same picture again, not the navigation). */
function biggestRival(
    document: Document,
    window: Window,
    element: HTMLImageElement,
    addresses: string[],
): Size | null {
    const base = document.baseURI;
    const region = element.closest(MAIN) ?? document.body;
    let biggest: Size | null = null;

    for (const other of Array.from(region.querySelectorAll('img'))) {
        const size = shownSize(other, window);

        if (
            other === element ||
            size === null ||
            other.closest(CHROME) !== null ||
            goesBy(other, window, base).some((address) =>
                addresses.some((own) => sameImage(address, own)),
            )
        ) {
            continue;
        }

        if (
            biggest === null ||
            size.width * size.height > biggest.width * biggest.height
        ) {
            biggest = size;
        }
    }

    return biggest;
}

/** The pictures the page names as its own, as absolute addresses. */
function namedPictures(document: Document, base: string): string[] {
    const metas = Array.from(
        document.querySelectorAll(NAMED_PICTURES.join(',')),
    ).map((meta) => meta.getAttribute('content'));
    const links = Array.from(
        document.querySelectorAll('link[rel="image_src"]'),
    ).map((link) => link.getAttribute('href'));
    const documents = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]'),
    ).flatMap((script) => {
        try {
            return [JSON.parse(script.textContent ?? '') as unknown];
        } catch {
            return [];
        }
    });

    return [...metas, ...links, ...jsonLdImages(documents)]
        .map((value) => absolute(value, base))
        .filter((address): address is string => address !== null);
}

/** An address as an absolute one; null for nothing. Any scheme: the decision says which ones count. */
function absolute(
    value: string | null | undefined,
    base: string,
): string | null {
    const trimmed = value?.trim();

    if (trimmed === undefined || trimmed === '') {
        return null;
    }

    try {
        return new URL(trimmed, base).href;
    } catch {
        return null;
    }
}

/** Text as one line, cut to a length; null for nothing. */
function text(value: string | null | undefined, length: number): string | null {
    const line = value?.replace(/\s+/g, ' ').trim();

    return line === undefined || line === '' ? null : line.slice(0, length);
}
