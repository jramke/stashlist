import type {
    Collection,
    Lookup,
    Me,
    SaveRequest,
    SaveResult,
    TagSuggestion,
} from './types';

/** Something the server or the network said no to. `message` is fit to show to a person. */
export class ApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
        readonly errors: Record<string, string[]> = {},
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/** The token is missing, wrong or revoked. */
export class Unauthorized extends ApiError {
    constructor() {
        super(401, 'The token is not valid. Make a new one in Stashlist.');
        this.name = 'Unauthorized';
    }
}

/** The server could not be reached at all. */
export class Unreachable extends ApiError {
    constructor(instance: string) {
        super(
            0,
            `Could not reach ${instance}. Check the address and your connection.`,
        );
        this.name = 'Unreachable';
    }
}

type Config = {
    instance: string;
    token: string;
    /** Injected in tests. */
    fetch?: typeof globalThis.fetch;
};

type Wire = {
    id: number;
    created: boolean;
    type: string;
    url: string | null;
    title: string;
    tags: string[];
    web_url: string;
};

/**
 * The capture API of a Stashlist instance (plan 6.3). Every call carries the bearer token; nothing else is
 * ever sent, so there is no cookie to fight Laravel's CSRF and SameSite rules.
 */
export function createClient(config: Config) {
    const base = config.instance.replace(/\/+$/, '');

    async function call(
        path: string,
        init: {
            method?: string;
            json?: unknown;
            form?: FormData;
            idempotencyKey?: string;
        } = {},
    ): Promise<unknown> {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${config.token}`,
            Accept: 'application/json',
        };

        if (init.idempotencyKey !== undefined) {
            headers['Idempotency-Key'] = init.idempotencyKey;
        }

        if (init.json !== undefined) {
            headers['Content-Type'] = 'application/json';
        }

        let response: Response;

        try {
            response = await (config.fetch ?? globalThis.fetch)(
                `${base}/api/v1/${path}`,
                {
                    method: init.method ?? 'GET',
                    headers,
                    body:
                        init.json !== undefined
                            ? JSON.stringify(init.json)
                            : (init.form ?? null),
                },
            );
        } catch {
            throw new Unreachable(base);
        }

        if (response.status === 401) {
            throw new Unauthorized();
        }

        const body: unknown = await response.json().catch(() => null);

        if (!response.ok) {
            throw failure(
                response.status,
                body,
                response.headers.get('Retry-After'),
            );
        }

        return body;
    }

    return {
        async me(): Promise<Me> {
            const body = (await call('me')) as {
                name: string;
                ai_enabled: boolean;
                limits: {
                    creates_per_minute: number;
                    lookups_per_minute: number;
                    content_markdown_bytes: number;
                    screenshot_bytes: number;
                    image_bytes: number;
                };
            };

            return {
                name: body.name,
                aiEnabled: body.ai_enabled,
                limits: {
                    createsPerMinute: body.limits.creates_per_minute,
                    lookupsPerMinute: body.limits.lookups_per_minute,
                    contentMarkdownBytes: body.limits.content_markdown_bytes,
                    screenshotBytes: body.limits.screenshot_bytes,
                    imageBytes: body.limits.image_bytes,
                },
            };
        },

        async lookup(url: string): Promise<Lookup> {
            return (await call(
                `stashes/lookup?url=${encodeURIComponent(url)}`,
            )) as Lookup;
        },

        async tags(prefix = ''): Promise<TagSuggestion[]> {
            const body = (await call(
                `tags?q=${encodeURIComponent(prefix)}`,
            )) as {
                data: { id: number; name: string; stashes_count: number }[];
            };

            return body.data.map((tag) => ({
                id: tag.id,
                name: tag.name,
                stashesCount: tag.stashes_count,
            }));
        },

        async collections(): Promise<Collection[]> {
            const body = (await call('collections')) as {
                data: { id: number; name: string; stashes_count: number }[];
            };

            return body.data.map((collection) => ({
                id: collection.id,
                name: collection.name,
                stashesCount: collection.stashes_count,
            }));
        },

        /**
         * Saves something. Pass the same `idempotencyKey` when sending the same save again after a failure,
         * so a lost answer cannot make two stashes.
         */
        async save(
            request: SaveRequest,
            idempotencyKey: string,
        ): Promise<SaveResult> {
            const fields = toFields(request);
            const files = Object.entries({
                screenshot: request.screenshot,
                image: request.image,
            }).filter(
                (entry): entry is [string, Blob] => entry[1] !== undefined,
            );

            const body =
                files.length === 0
                    ? await call('stashes', {
                          method: 'POST',
                          json: fields,
                          idempotencyKey,
                      })
                    : await call('stashes', {
                          method: 'POST',
                          form: toForm(fields, files),
                          idempotencyKey,
                      });

            const wire = body as Wire;

            return {
                id: wire.id,
                created: wire.created,
                type: wire.type,
                url: wire.url,
                title: wire.title,
                tags: wire.tags,
                webUrl: wire.web_url,
            };
        },
    };
}

export type Client = ReturnType<typeof createClient>;

/** The JSON fields of a save, in the names the API uses. Empty values are left out. */
export function toFields(request: SaveRequest): Record<string, unknown> {
    const { capture, collectionIds, tags } = request;

    return prune({
        type: request.type,
        url: request.url,
        title: request.title,
        body: request.body,
        tags,
        collection_ids: collectionIds,
        capture: capture === undefined ? undefined : prune({ ...capture }),
    });
}

/**
 * The same fields as a multipart form, for a save with files. PHP reads `a[b]` and `a[]` as nested arrays, so
 * nested values are flattened to that notation; booleans become 1 and 0.
 */
export function toForm(
    fields: Record<string, unknown>,
    files: [string, Blob][],
): FormData {
    const form = new FormData();

    append(form, fields);

    for (const [name, blob] of files) {
        form.append(name, blob, `${name}.${extension(blob.type)}`);
    }

    return form;
}

function append(form: FormData, value: unknown, key = ''): void {
    if (value === undefined || value === null) {
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            append(
                form,
                item,
                `${key}[${typeof item === 'object' ? index : ''}]`,
            );
        });

        return;
    }

    if (typeof value === 'object') {
        for (const [name, inner] of Object.entries(value)) {
            append(form, inner, key === '' ? name : `${key}[${name}]`);
        }

        return;
    }

    form.append(
        key,
        typeof value === 'boolean' ? (value ? '1' : '0') : String(value),
    );
}

function prune(object: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(object).filter(([, value]) => {
            if (value === undefined || value === null || value === '') {
                return false;
            }

            return !(Array.isArray(value) && value.length === 0);
        }),
    );
}

function extension(mime: string): string {
    return mime === 'image/webp'
        ? 'webp'
        : mime === 'image/png'
          ? 'png'
          : 'bin';
}

function failure(
    status: number,
    body: unknown,
    retryAfter: string | null,
): ApiError {
    const data = (body ?? {}) as {
        message?: string;
        errors?: Record<string, string[]>;
    };
    const errors = data.errors ?? {};

    switch (status) {
        case 403:
            return new ApiError(
                status,
                'This token is not allowed to do that.',
                errors,
            );
        case 413:
            return new ApiError(
                status,
                'The page is too large to stash.',
                errors,
            );
        case 422:
            return new ApiError(
                status,
                Object.values(errors)[0]?.[0] ??
                    data.message ??
                    'Stashlist did not accept that.',
                errors,
            );
        case 429:
            return new ApiError(
                status,
                retryAfter === null
                    ? 'Too many requests. Try again in a moment.'
                    : `Too many requests. Try again in ${retryAfter} seconds.`,
                errors,
            );
        default:
            return new ApiError(
                status,
                data.message ?? 'Stashlist could not save that.',
                errors,
            );
    }
}
