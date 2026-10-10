/** What the script that runs in the page reports about it. */
export type PageCapture = {
    url: string;
    title: string;
    description: string | null;
    siteName: string | null;
    author: string | null;
    published: string | null;
    language: string | null;
    faviconUrl: string | null;
    imageUrl: string | null;
    /** The readable part of the page as Markdown; null when the page has none. */
    contentMarkdown: string | null;
    schemaOrg: unknown[];
};

/** The `capture` block of POST /api/v1/stashes (plan 6.3). */
export type CaptureBlock = {
    source: 'extension';
    version: string;
    content_markdown?: string;
    description?: string;
    site_name?: string;
    author?: string;
    published?: string;
    language?: string;
    favicon_url?: string;
    image_url?: string;
    schema_org?: unknown[];
};

export type SaveRequest = {
    type?: 'link' | 'note' | 'image' | 'color';
    url?: string;
    title?: string;
    body?: string;
    tags?: string[];
    collectionIds?: number[];
    capture?: CaptureBlock;
    screenshot?: Blob;
    image?: Blob;
};

export type SaveResult = {
    id: number;
    created: boolean;
    type: string;
    url: string | null;
    title: string;
    tags: string[];
    webUrl: string;
};

export type Lookup = {
    saved: boolean;
    id: number | null;
    title: string | null;
    tags: string[];
};

export type Collection = { id: number; name: string; stashesCount: number };

export type TagSuggestion = { id: number; name: string; stashesCount: number };

export type Me = {
    name: string;
    aiEnabled: boolean;
    limits: {
        createsPerMinute: number;
        lookupsPerMinute: number;
        contentMarkdownBytes: number;
        screenshotBytes: number;
        imageBytes: number;
    };
};

/** What the person may change before saving. */
export type Edits = {
    title: string;
    tags: string[];
    collectionIds: number[];
};

export type Defaults = {
    tags: string[];
    collectionIds: number[];
    /** Send a screenshot of the visible part of the page along. */
    screenshot: boolean;
};
