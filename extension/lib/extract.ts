import Defuddle from 'defuddle/full';
import type { PageCapture } from './types';

/**
 * Reads a document the way the person sees it and returns what Stashlist keeps of it: the readable part as
 * Markdown, and what the page says about itself. Runs in the page, so a login, a paywall the person got past
 * and script-rendered text all count.
 *
 * `useAsync: false` keeps Defuddle from calling a third-party API for some pages; the page is read locally or
 * not at all.
 */
export function extractPage(document: Document, url: string): PageCapture {
    const readable = new Defuddle(flattenShadowDom(document), {
        url,
        markdown: true,
        useAsync: false,
    }).parse();

    return {
        url,
        title: line(readable.title) ?? line(document.title) ?? url,
        description: line(readable.description),
        siteName: line(readable.site),
        author: line(readable.author),
        published: line(readable.published),
        language:
            line(readable.language) ?? line(document.documentElement.lang),
        faviconUrl: absolute(line(readable.favicon), url),
        imageUrl: absolute(line(readable.image), url),
        contentMarkdown: clean(readable.content),
        schemaOrg: schemaOrgList(readable.schemaOrgData),
    };
}

/**
 * A copy of the document in which open shadow roots are part of the tree. Defuddle reads the light DOM only,
 * so text inside web components would be lost. The page itself is not touched.
 */
export function flattenShadowDom(source: Document): Document {
    const copy = source.cloneNode(true) as Document;
    const originals = Array.from(source.querySelectorAll('*'));
    const copies = Array.from(copy.querySelectorAll('*'));

    originals.forEach((original, index) => {
        const root = original.shadowRoot;
        const target = copies[index];

        if (root === null || target === undefined) {
            return;
        }

        const wrapper = copy.createElement('div');
        wrapper.setAttribute('data-shadow-root', '');
        wrapper.innerHTML = root.innerHTML;
        target.appendChild(wrapper);
    });

    return copy;
}

/** The API takes absolute addresses only; pages often name their picture and icon relative to themselves. */
function absolute(value: string | null, base: string): string | null {
    if (value === null) {
        return null;
    }

    try {
        const resolved = new URL(value, base);

        return resolved.protocol === 'http:' || resolved.protocol === 'https:'
            ? resolved.href
            : null;
    } catch {
        return null;
    }
}

/** A value that is one line: runs of white space become a single space. */
function line(value: string | null | undefined): string | null {
    return clean(value?.replace(/\s+/g, ' '));
}

function clean(value: string | null | undefined): string | null {
    const text = value?.trim();

    return text === undefined || text === '' ? null : text;
}

function schemaOrgList(data: unknown): unknown[] {
    if (data === null || data === undefined || data === '') {
        return [];
    }

    return Array.isArray(data) ? data : [data];
}
