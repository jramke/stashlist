import type { CaptureBlock, Edits, PageCapture, SaveRequest } from './types';

/**
 * The request for saving a page. What the person edited goes in the top-level fields; what the page said
 * about itself goes in the capture block, where the server takes it as input to keep, not to trust.
 */
export function buildSaveRequest(
    page: PageCapture,
    edits: Edits,
    version: string,
    screenshot: Blob | null,
): SaveRequest {
    const capture: CaptureBlock = { source: 'extension', version };

    if (page.contentMarkdown !== null)
        capture.content_markdown = page.contentMarkdown;
    if (page.description !== null) capture.description = page.description;
    if (page.siteName !== null) capture.site_name = page.siteName;
    if (page.author !== null) capture.author = page.author;
    if (page.published !== null) capture.published = page.published;
    if (page.language !== null) capture.language = page.language;
    if (page.faviconUrl !== null) capture.favicon_url = page.faviconUrl;
    if (page.imageUrl !== null) capture.image_url = page.imageUrl;
    if (page.schemaOrg.length > 0) capture.schema_org = page.schemaOrg;

    const request: SaveRequest = {
        type: 'link',
        url: page.url,
        title: edits.title.trim() === '' ? page.title : edits.title.trim(),
        tags: edits.tags,
        collectionIds: edits.collectionIds,
        capture,
    };

    if (screenshot !== null) {
        request.screenshot = screenshot;
    }

    return request;
}

/**
 * A page to stash with the person's defaults and no popup: the title the page has, the tags and collections
 * from the options.
 */
export function quickEdits(
    page: PageCapture,
    defaults: { tags: string[]; collectionIds: number[] },
): Edits {
    return {
        title: page.title,
        tags: defaults.tags,
        collectionIds: defaults.collectionIds,
    };
}

/** The tag names typed in a field: comma separated, trimmed, without doubles (case does not count). */
export function parseTags(input: string): string[] {
    const seen = new Set<string>();

    return input
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => {
            const key = tag.toLowerCase();

            if (tag === '' || seen.has(key)) {
                return false;
            }

            seen.add(key);

            return true;
        });
}
