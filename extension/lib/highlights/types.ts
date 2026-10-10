/** A highlight as the extension keeps it: what the server holds, in camelCase. */
export type StoredHighlight = {
    id: number;
    stashId: number;
    /** Hash of the normalized address of the page (64 hex characters); null when the stash has no address. */
    urlHash: string | null;
    text: string;
    prefix: string;
    suffix: string;
    startOffset: number | null;
    color: string | null;
    note: string | null;
    /** Grows with every change on the server: what sync compares. */
    revision: number;
};

/** A passage to mark on a page, as the API takes it. */
export type NewHighlight = {
    url: string;
    title: string;
    text: string;
    prefix: string;
    suffix: string;
    startOffset: number | null;
    color?: string;
    note?: string;
};

export type HighlightIndex = { id: number; v: number }[];

export type IndexAnswer =
    | { changed: false }
    | { changed: true; etag: string | null; list: HighlightIndex };
