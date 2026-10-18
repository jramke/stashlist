import { normalizeUrl } from './normalize-url';

/**
 * What a right-click on a picture saves ("Stash image"). It is decided by what the page says about the picture,
 * and not by the click alone, so a person can tell beforehand what they will get:
 *
 * 1. The picture is the page's own (the photo of a product in a shop, the lead picture of an article): the PAGE is
 *    stashed, exactly as "Stash page" does, with this picture as its picture. Stashlist then knows it is a product
 *    and what it costs, and the person has a link to the page, not a loose picture.
 * 2. Any other picture (a photo inside an article, one in a gallery, a picture on a page that is not about it,
 *    anything inside a frame): the PICTURE is stashed. Its title is what the page says about it (the alt text, else
 *    the caption, else the title attribute) and its source is the page it was on, or the page it links to when it
 *    is a link to another page (a teaser, a gallery tile).
 *
 * A picture is the page's own when the tab is a web page (and not the picture file itself, which has no page around
 * it: that is stashed as a picture, with no source), the picture is in the page and not in a frame of it, it is
 * shown at least 100 pixels each way and not in the navigation, a sidebar or the footer, and
 *   a. the page names it: it is the page's `og:image`, `twitter:image` or the image of the main entity in its
 *      JSON-LD, the same file once sizes, `dpr`, `preset` and the like are ignored (`sameImage`); or
 *   b. it is the biggest picture on screen in the main content (at least 200 pixels each way and a quarter bigger
 *      than the next one), and it does not link to another page: a picture that leads somewhere is that page's
 *      teaser, not this page's picture.
 *
 * Whichever is saved, the address of the picture is the largest one the page offers for it (`srcset`, then what
 * the browser loaded), because the address the browser reports for the click is often a small variant.
 */

/** Smallest size, each way, at which a picture the page names counts as the page's own. */
export const NAMED_EDGE = 100;

/** Smallest size, each way, at which a picture can be the biggest one that stands for the page. */
export const BIG_EDGE = 200;

/** The biggest picture must be this many times the area of the next one. */
export const CLEAR_MARGIN = 1.25;

/** The longest title taken from the page's words about a picture. */
const TITLE_LENGTH = 200;

/** The longest address the API takes. */
export const ADDRESS_LENGTH = 2048;

export type Size = { width: number; height: number };

/** What the script that runs in the page found out about the picture that was clicked. */
export type ClickedImage = {
    /** Every address the picture goes by, the largest first. */
    addresses: string[];
    alt: string | null;
    title: string | null;
    /** The `figcaption` of the figure the picture is in. */
    caption: string | null;
    /** Where the link around the picture leads (absolute); null when the picture is not in a link. */
    link: string | null;
    /** The pictures the page names as its own: Open Graph, Twitter card, JSON-LD (absolute addresses). */
    named: string[];
    /** The size it is shown at in CSS pixels; null when it is not shown. */
    size: Size | null;
    /** Inside the navigation, a sidebar or the footer. */
    inChrome: boolean;
    /** The biggest other picture on screen in the main content; null when there is none. */
    rival: Size | null;
};

export type ImageSituation = {
    /** The address of the tab. */
    page: string;
    /** The address the browser reported for the click. */
    clicked: string;
    /** False when the picture is inside a frame of the page. */
    inPage: boolean;
    /** What the page said; null when it could not be asked (a page the browser keeps to itself). */
    image: ClickedImage | null;
};

export type ImageIntent =
    | {
          kind: 'page';
          reason: 'named' | 'biggest';
          /** The addresses of the picture to try, the best first. */
          addresses: string[];
      }
    | {
          kind: 'image';
          addresses: string[];
          title: string | null;
          source: string | null;
      };

export function decideImage(situation: ImageSituation): ImageIntent {
    const { page, clicked, inPage, image } = situation;
    const addresses = unique([...(image?.addresses ?? []), clicked]);
    // A tab that shows the picture file itself: there is no page around it.
    const isFile =
        IMAGE_FILE.test(pathOf(page)) ||
        addresses.some((address) => sameImage(address, page));

    if (image !== null && inPage && isWebAddress(page) && !isFile) {
        const reason = ownPicture(image, addresses, page);

        if (reason !== null) {
            return { kind: 'page', reason, addresses };
        }
    }

    return {
        kind: 'image',
        addresses,
        title: titleOf(image),
        source: isFile ? null : sourceOf(image?.link ?? null, page),
    };
}

function ownPicture(
    image: ClickedImage,
    addresses: string[],
    page: string,
): 'named' | 'biggest' | null {
    const { size } = image;

    if (image.inChrome || size === null) {
        return null;
    }

    if (
        size.width >= NAMED_EDGE &&
        size.height >= NAMED_EDGE &&
        addresses.some((address) =>
            image.named.some((name) => sameImage(address, name)),
        )
    ) {
        return 'named';
    }

    if (isBiggest(size, image.rival) && leadsTo(image.link, page) === null) {
        return 'biggest';
    }

    return null;
}

/** Whether a picture shown at `size` is the biggest on screen by a clear margin. */
export function isBiggest(size: Size, rival: Size | null): boolean {
    if (size.width < BIG_EDGE || size.height < BIG_EDGE) {
        return false;
    }

    return (
        rival === null ||
        size.width * size.height >= rival.width * rival.height * CLEAR_MARGIN
    );
}

/**
 * The page a link leads to, or null when it leads nowhere that is another page: no link, a link that is not a web
 * address (mail, script), the page itself (an anchor in it), or a picture file (a larger view of the same
 * picture).
 */
export function leadsTo(link: string | null, page: string): string | null {
    const target = link === null ? null : normalizeUrl(link);

    if (
        link === null ||
        target === null ||
        target === normalizeUrl(page) ||
        IMAGE_FILE.test(pathOf(link))
    ) {
        return null;
    }

    return link.length <= ADDRESS_LENGTH ? link : null;
}

/** Where a picture came from: the page its link leads to, else the page it is on. */
export function sourceOf(link: string | null, page: string): string | null {
    if (isWebAddress(page) && page.length <= ADDRESS_LENGTH) {
        return leadsTo(link, page) ?? page;
    }

    return null;
}

/**
 * The title for a picture from what the page says about it: its alt text, else the caption of its figure, else
 * its title attribute; the first that says something, at most 200 characters. Null when none does.
 */
export function titleOf(
    image: Pick<ClickedImage, 'alt' | 'caption' | 'title'> | null,
): string | null {
    for (const text of [image?.alt, image?.caption, image?.title]) {
        const words = (text ?? '').replace(/\s+/g, ' ').trim();

        if (!isNoise(words)) {
            return words.length > TITLE_LENGTH
                ? `${words.slice(0, TITLE_LENGTH - 1).trimEnd()}…`
                : words;
        }
    }

    return null;
}

/** Text that says nothing about a picture: empty, a file name, "image 3", a bare address. */
function isNoise(words: string): boolean {
    return (
        words.length < 3 ||
        /^(?:https?:\/\/|www\.)/i.test(words) ||
        /\.(?:jpe?g|png|gif|webp|avif|svg|bmp|heic)$/i.test(words) ||
        /^(?:img|dsc|image|photo|picture|pic|logo|banner|thumbnail|thumb|icon|avatar|placeholder|untitled|spacer|graphic)[\s_-]*\d*$/i.test(
            words,
        ) ||
        /^[\d\s_-]+$/.test(words)
    );
}

// ---------------------------------------------------------------------------------------------------------------
// The same file under another size

const IMAGE_FILE = /\.(?:jpe?g|jfif|png|gif|webp|avif|bmp|tiff?|heic|heif)$/i;

/** Parameters that only decide how a file is sized, compressed, cropped or cached: the same file under another one. */
const TRANSFORM_PARAMS = new Set([
    'w',
    'h',
    'width',
    'height',
    'wid',
    'hei',
    'size',
    'maxwidth',
    'maxheight',
    'imwidth',
    'resize',
    'fit',
    'crop',
    'ar',
    'dpr',
    'scale',
    'preset',
    'q',
    'quality',
    'fm',
    'fmt',
    'format',
    'auto',
    'output',
    'ixlib',
    'ixid',
    'v',
    'ver',
    'version',
    'rev',
    't',
    'ts',
    'timestamp',
    'cb',
    'cache',
    '_',
]);

/** A folder that only says how the file is sized: `w_300,h_200,c_fill`, `300x200`, `thumbs`, a version `v123`. */
const SIZE_FOLDER =
    /^(?:[a-z]{1,3}_[^,/]+(?:,[a-z]{1,3}_[^,/]+)*|\d+x\d+|[wh]\d+(?:-[wh]\d+)?|v\d+|thumbs?|thumbnails?|small|medium|large|original|originals|full|resized?)$/i;

/** What a file name ends in when it is a resized copy: `-300x200`, `_grande`, `@2x`, `-scaled`, Amazon's `._SL1500_`. */
const SIZE_SUFFIX =
    /(?:[-_.@](?:\d+x\d*|x\d+|\d+w|w\d+|h\d+|[23]x|pico|icon|thumb|thumbnail|small|compact|medium|large|grande|master|original|full|big|scaled)|\._[^.]+_)+$/i;

/**
 * Whether two addresses are the same picture: the same file under a different size. The scheme, `www.`, the
 * fragment, the file type, the size marks of the name (`-300x200`, `_grande`, `@2x`), size folders and the query
 * parameters that only size, compress or cache (`width`, `dpr`, `preset`, `q`, `v`...) do not count; anything else
 * does, so `photo.php?id=1` and `photo.php?id=2` are two pictures. Addresses have to be absolute.
 */
export function sameImage(a: string, b: string): boolean {
    const key = imageKey(a);

    return key !== null && key === imageKey(b);
}

function imageKey(address: string): string | null {
    let url: URL;

    try {
        url = new URL(address);
    } catch {
        return null;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
    }

    const segments = url.pathname
        .split('/')
        .map(decoded)
        .filter((segment) => segment !== '');
    const file = (segments.pop() ?? '').replace(IMAGE_FILE, '');
    const folders = segments.filter((segment) => !SIZE_FOLDER.test(segment));
    const query = Array.from(url.searchParams)
        .filter(([name]) => !TRANSFORM_PARAMS.has(name.toLowerCase()))
        .map(([name, value]) => `${name}=${value}`)
        .sort();

    return [
        url.hostname.toLowerCase().replace(/^www\./, ''),
        ...folders,
        file.replace(SIZE_SUFFIX, '') || file,
        query.join('&'),
    ].join('/');
}

function decoded(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

// ---------------------------------------------------------------------------------------------------------------
// What the page's JSON-LD says its pictures are

/** Entities of a page that describe the site and not the page; their pictures are logos and portraits. */
const SITE_TYPES = new Set([
    'Organization',
    'Corporation',
    'NGO',
    'WebSite',
    'Person',
    'BreadcrumbList',
    'SiteNavigationElement',
    'WPHeader',
    'WPFooter',
    'WPSideBar',
    'ImageObject',
]);

type Entity = Record<string, unknown>;

/**
 * The pictures of the page's main entity (a Product, an Article, a Recipe...) in its JSON-LD documents: the
 * `image`, `primaryImageOfPage` and `thumbnailUrl` of every entity that is not the site itself, as addresses,
 * following a reference to an `ImageObject` of the same graph.
 */
export function jsonLdImages(documents: unknown[]): string[] {
    const nodes = documents.flatMap(graphNodes);
    const byId = new Map<string, Entity>();

    for (const node of nodes) {
        if (typeof node['@id'] === 'string') {
            byId.set(node['@id'], node);
        }
    }

    const found: string[] = [];

    for (const node of nodes.filter((entity) => !isSiteLevel(entity))) {
        for (const key of ['image', 'primaryImageOfPage', 'thumbnailUrl']) {
            collect(node[key], byId, found);
        }
    }

    return unique(found);
}

function graphNodes(document: unknown): Entity[] {
    if (Array.isArray(document)) {
        return document.flatMap(graphNodes);
    }

    if (!isRecord(document)) {
        return [];
    }

    const graph = document['@graph'];

    return Array.isArray(graph)
        ? [document, ...graph.flatMap(graphNodes)]
        : [document];
}

function isSiteLevel(node: Entity): boolean {
    const types = [node['@type']]
        .flat()
        .filter((type): type is string => typeof type === 'string');

    return types.length > 0 && types.every((type) => SITE_TYPES.has(type));
}

function collect(value: unknown, byId: Map<string, Entity>, found: string[]) {
    if (typeof value === 'string') {
        found.push(value);
    } else if (Array.isArray(value)) {
        value.forEach((item) => collect(item, byId, found));
    } else if (isRecord(value)) {
        const own = value['url'] ?? value['contentUrl'];
        const id = value['@id'];
        const referenced = typeof id === 'string' ? byId.get(id) : undefined;

        if (typeof own === 'string') {
            found.push(own);
        } else if (referenced !== undefined && referenced !== value) {
            const url = referenced['url'] ?? referenced['contentUrl'];

            if (typeof url === 'string') {
                found.push(url);
            }
        }
    }
}

function isRecord(value: unknown): value is Entity {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------------------------------------------
// srcset

export type SrcsetCandidate = {
    url: string;
    /** The `w` descriptor: the picture's width in pixels. */
    width: number | null;
    /** The `x` descriptor: its density. */
    density: number | null;
};

/**
 * The candidates of a `srcset` attribute, with their descriptors. A comma inside an address stays inside it
 * (`w_300,h_200` in a Cloudinary path); a comma ends an entry only after white space or at the end of its address.
 */
export function parseSrcset(value: string): SrcsetCandidate[] {
    const candidates: SrcsetCandidate[] = [];
    let at = 0;

    while (at < value.length) {
        while (at < value.length && /[\s,]/.test(value.charAt(at))) {
            at++;
        }

        const start = at;

        while (at < value.length && !/\s/.test(value.charAt(at))) {
            at++;
        }

        let url = value.slice(start, at);
        let descriptors = '';

        if (url.endsWith(',')) {
            url = url.replace(/,+$/, '');
        } else {
            const from = at;

            while (at < value.length && value.charAt(at) !== ',') {
                at++;
            }

            descriptors = value.slice(from, at);
        }

        if (url !== '') {
            candidates.push({
                url,
                width: descriptor(descriptors, 'w'),
                density: descriptor(descriptors, 'x'),
            });
        }
    }

    return candidates;
}

function descriptor(descriptors: string, unit: 'w' | 'x'): number | null {
    const found = new RegExp(`(\\d+(?:\\.\\d+)?)${unit}\\b`).exec(descriptors);

    return found?.[1] === undefined ? null : Number(found[1]);
}

// ---------------------------------------------------------------------------------------------------------------

/** Whether this is an address the API takes: http or https and not longer than it allows. */
export function isApiAddress(address: string): boolean {
    return isWebAddress(address) && address.length <= ADDRESS_LENGTH;
}

export function isWebAddress(address: string): boolean {
    return /^https?:\/\//i.test(address);
}

function pathOf(address: string): string {
    try {
        return new URL(address).pathname;
    } catch {
        return '';
    }
}

function unique(values: string[]): string[] {
    return Array.from(new Set(values));
}
