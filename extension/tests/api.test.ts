import { describe, expect, it, vi } from 'vitest';
import {
    ApiError,
    createClient,
    toFields,
    toForm,
    Unauthorized,
    Unreachable,
} from '../lib/api';
import { buildSaveRequest, parseTags } from '../lib/payload';
import type { PageCapture } from '../lib/types';

function reply(
    status: number,
    body: unknown,
    headers: Record<string, string> = {},
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    });
}

const page: PageCapture = {
    url: 'https://example.com/post',
    title: 'A post',
    description: 'About a post',
    siteName: 'Example',
    author: null,
    published: '2026-09-01',
    language: 'de-DE',
    faviconUrl: null,
    imageUrl: 'https://example.com/og.jpg',
    contentMarkdown: '# A post',
    schemaOrg: [{ '@type': 'Article' }],
};

describe('the API client', () => {
    it('sends the token as a bearer and asks for JSON', async () => {
        const fetch = vi.fn().mockResolvedValue(
            reply(200, {
                name: 'Ada',
                ai_enabled: true,
                limits: {
                    creates_per_minute: 60,
                    lookups_per_minute: 120,
                    content_markdown_bytes: 200000,
                    screenshot_bytes: 2097152,
                    image_bytes: 20971520,
                },
            }),
        );
        const client = createClient({
            instance: 'https://stashlist.app/',
            token: '1|stl_abc',
            fetch,
        });

        const me = await client.me();

        expect(me.name).toBe('Ada');
        expect(me.limits.screenshotBytes).toBe(2097152);
        expect(fetch).toHaveBeenCalledWith(
            'https://stashlist.app/api/v1/me',
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer 1|stl_abc',
                    Accept: 'application/json',
                }),
            }),
        );
    });

    it('saves as JSON with the idempotency key, and maps the answer', async () => {
        const fetch = vi.fn().mockResolvedValue(
            reply(201, {
                id: 7,
                created: true,
                type: 'link',
                url: 'https://example.com/post',
                title: 'A post',
                tags: ['x'],
                web_url: 'https://stashlist.app/stashes/7',
            }),
        );
        const client = createClient({
            instance: 'https://stashlist.app',
            token: 't',
            fetch,
        });

        const result = await client.save(
            buildSaveRequest(
                page,
                { title: '', tags: ['x'], collectionIds: [3] },
                '2.0.0',
                null,
            ),
            'key-1',
        );

        const [, init] = fetch.mock.calls[0] as [string, RequestInit];
        expect(result).toEqual({
            id: 7,
            created: true,
            type: 'link',
            url: 'https://example.com/post',
            title: 'A post',
            tags: ['x'],
            webUrl: 'https://stashlist.app/stashes/7',
        });
        expect(init.method).toBe('POST');
        expect(
            (init.headers as Record<string, string>)['Idempotency-Key'],
        ).toBe('key-1');
        expect(JSON.parse(init.body as string)).toEqual({
            type: 'link',
            url: 'https://example.com/post',
            title: 'A post',
            tags: ['x'],
            collection_ids: [3],
            capture: {
                source: 'extension',
                version: '2.0.0',
                content_markdown: '# A post',
                description: 'About a post',
                site_name: 'Example',
                published: '2026-09-01',
                language: 'de-DE',
                image_url: 'https://example.com/og.jpg',
                schema_org: [{ '@type': 'Article' }],
            },
        });
    });

    it('saves with files as a form PHP can read', async () => {
        const fetch = vi.fn().mockResolvedValue(
            reply(201, {
                id: 1,
                created: true,
                type: 'link',
                url: null,
                title: 't',
                tags: [],
                web_url: 'x',
            }),
        );
        const client = createClient({
            instance: 'https://stashlist.app',
            token: 't',
            fetch,
        });
        const screenshot = new Blob(['webp'], { type: 'image/webp' });

        await client.save(
            buildSaveRequest(
                page,
                {
                    title: 'Mine',
                    tags: ['a', 'b'],
                    collectionIds: [1, 2],
                },
                '2.0.0',
                screenshot,
            ),
            'key-2',
        );

        const [, init] = fetch.mock.calls[0] as [string, RequestInit];
        const form = init.body as FormData;
        expect(form).toBeInstanceOf(FormData);
        expect(form.getAll('tags[]')).toEqual(['a', 'b']);
        expect(form.getAll('collection_ids[]')).toEqual(['1', '2']);
        expect(form.get('capture[source]')).toBe('extension');
        expect(form.get('capture[schema_org][0][@type]')).toBe('Article');
        expect((form.get('screenshot') as Blob).type).toBe('image/webp');
        expect(
            (init.headers as Record<string, string>)['Content-Type'],
        ).toBeUndefined();
    });

    it('turns what the server says into errors a person can read', async () => {
        const calls = [
            [reply(401, { message: 'Unauthenticated.' }), Unauthorized],
            [reply(403, { message: 'Forbidden' }), ApiError],
            [
                reply(422, {
                    message: 'x',
                    errors: { url: ['The url field must be a valid URL.'] },
                }),
                ApiError,
            ],
            [reply(429, {}, { 'Retry-After': '12' }), ApiError],
        ] as const;
        const messages: string[] = [];

        for (const [response, type] of calls) {
            const client = createClient({
                instance: 'https://stashlist.app',
                token: 't',
                fetch: vi.fn().mockResolvedValue(response),
            });
            const error = await client
                .lookup('https://example.com')
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(type);
            messages.push((error as Error).message);
        }

        expect(messages[2]).toBe('The url field must be a valid URL.');
        expect(messages[3]).toContain('12 seconds');
    });

    it('says so when the server cannot be reached', async () => {
        const client = createClient({
            instance: 'https://nowhere.example',
            token: 't',
            fetch: vi.fn().mockRejectedValue(new TypeError('failed')),
        });

        await expect(client.tags('de')).rejects.toBeInstanceOf(Unreachable);
    });

    it('escapes what it looks up', async () => {
        const fetch = vi
            .fn()
            .mockResolvedValue(
                reply(200, { saved: false, id: null, title: null, tags: [] }),
            );
        const client = createClient({
            instance: 'https://stashlist.app',
            token: 't',
            fetch,
        });

        await client.lookup('https://example.com/a?b=c&d=e');

        expect(fetch.mock.calls[0]?.[0]).toBe(
            'https://stashlist.app/api/v1/stashes/lookup?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3Dc%26d%3De',
        );
    });
});

describe('building a save', () => {
    it('leaves out what the page did not say', () => {
        const bare: PageCapture = {
            ...page,
            description: null,
            siteName: null,
            published: null,
            language: null,
            imageUrl: null,
            contentMarkdown: null,
            schemaOrg: [],
        };

        expect(
            toFields(
                buildSaveRequest(
                    bare,
                    { title: 'T', tags: [], collectionIds: [] },
                    '2.0.0',
                    null,
                ),
            ),
        ).toEqual({
            type: 'link',
            url: 'https://example.com/post',
            title: 'T',
            capture: { source: 'extension', version: '2.0.0' },
        });
    });

    it('turns booleans and nested values into form fields', () => {
        const form = toForm(
            {
                flag: true,
                off: false,
                nested: { a: [{ b: 'c' }] },
                list: ['x', 'y'],
            },
            [],
        );

        expect([...form.entries()]).toEqual([
            ['flag', '1'],
            ['off', '0'],
            ['nested[a][0][b]', 'c'],
            ['list[]', 'x'],
            ['list[]', 'y'],
        ]);
    });

    it('reads tags from a comma separated field', () => {
        expect(parseTags(' design, Inspiration ,,design,  ')).toEqual([
            'design',
            'Inspiration',
        ]);
    });
});
