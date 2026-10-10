import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalizeUrl, urlHash } from '../lib/normalize-url';

const fixture = JSON.parse(
    readFileSync(
        join(
            dirname(fileURLToPath(import.meta.url)),
            '../../tests/fixtures/url-normalization.json',
        ),
        'utf8',
    ),
) as { cases: { input: string; expected: string | null }[] };

describe('normalizeUrl', () => {
    // The same file is run by the PHP tests: what the server hashes, the extension hashes.
    it.each(fixture.cases)('$input', ({ input, expected }) => {
        expect(normalizeUrl(input)).toBe(expected);
    });
});

describe('urlHash', () => {
    it('is the sha256 of the normalized address, in hex', async () => {
        // sha256("https://example.com/") computed with PHP: hash('sha256', 'https://example.com/').
        expect(await urlHash('https://example.com/')).toBe(
            '0f115db062b7c0dd030b16878c99dea5c354b49dc37b38eb8846179c7783e9d7',
        );
    });
});
