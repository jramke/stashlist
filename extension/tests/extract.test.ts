import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractPage, flattenShadowDom } from '../lib/extract';

const fixtures = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../tests/fixtures/pages',
);

function load(name: string): Document {
    return new DOMParser().parseFromString(
        readFileSync(join(fixtures, `${name}.html`), 'utf8'),
        'text/html',
    );
}

describe('extractPage', () => {
    it('reads an article: title, text as Markdown and what the page says about itself', () => {
        const url = 'https://bakeclub.example/posts/starter';
        const page = extractPage(load('article'), url);

        expect(page.url).toBe(url);
        expect(page.title).toContain('sourdough starter');
        expect(page.contentMarkdown).toContain('living culture of wild yeast');
        expect(page.contentMarkdown).not.toContain('<p>');
        expect(page.contentMarkdown).not.toContain('Copyright');
        expect(page.siteName).toBe('Bake Club');
        expect(page.language).toBe('en-GB');
    });

    it('names the picture and the icon with absolute addresses, because the API takes nothing else', () => {
        const page = extractPage(
            load('article'),
            'https://bakeclub.example/posts/starter',
        );

        expect(page.imageUrl).toBe('https://bakeclub.example/img/starter.jpg');
        expect(page.faviconUrl).toBe(
            'https://bakeclub.example/static/favicon.png',
        );
    });

    it('keeps what a shop page says in its JSON-LD', () => {
        const page = extractPage(
            load('shop'),
            'https://hearth.example/skillet',
        );

        expect(page.title).toContain('Cast iron skillet');
        expect(page.contentMarkdown).toContain('pre-seasoned skillet');
        expect(JSON.stringify(page.schemaOrg)).toContain('39.90');
        expect(page.siteName).toBe('Hearth & Home');
    });

    it('gives a page script-rendered nothing: no text, but still a title and an address', () => {
        const page = extractPage(load('spa-shell'), 'https://app.example/');

        expect(page.title).toBe('App');
        expect(page.url).toBe('https://app.example/');
        expect(page.contentMarkdown ?? '').not.toContain('enable JavaScript');
    });

    it('falls back to the document title and language when the extractor finds none', () => {
        const page = extractPage(load('minimal'), 'https://example.de/kurz');

        expect(page.title).toBe('Nur ein Titel');
        expect(page.language).toBe('de-DE');
    });

    it('reads text that lives in a shadow root', () => {
        const document = new DOMParser().parseFromString(
            '<!doctype html><html><head><title>Widget page</title></head><body><main><h1>Widget page</h1><div id="host"></div></main></body></html>',
            'text/html',
        );
        const root = document
            .getElementById('host')
            ?.attachShadow({ mode: 'open' });
        root?.append(
            Object.assign(document.createElement('p'), {
                textContent:
                    'The explanation of the widget is written inside a web component, in a paragraph long enough to count as the content of the page by any reasonable measure.',
            }),
        );

        expect(
            extractPage(document, 'https://example.com/widget').contentMarkdown,
        ).toContain('written inside a web component');
    });
});

describe('flattenShadowDom', () => {
    it('brings the text of open shadow roots into the copy and leaves the page alone', () => {
        const document = new DOMParser().parseFromString(
            '<body><div id="host"></div></body>',
            'text/html',
        );
        document
            .getElementById('host')
            ?.attachShadow({ mode: 'open' })
            .append(
                Object.assign(document.createElement('p'), {
                    textContent: 'Inside the shadow',
                }),
            );

        const copy = flattenShadowDom(document);

        expect(copy.body.textContent).toContain('Inside the shadow');
        expect(document.body.textContent).not.toContain('Inside the shadow');
    });
});
