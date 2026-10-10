import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { normalizeUrl, urlHash } from '../lib/normalize-url';
import { sha256Hex } from '../lib/sha256';

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

    it('is the same without crypto.subtle, as on an http page', async () => {
        const expected = await urlHash('https://example.com/');

        vi.stubGlobal('crypto', {});

        try {
            expect(await urlHash('https://example.com/')).toBe(expected);
        } finally {
            vi.unstubAllGlobals();
        }
    });
});

describe('sha256Hex', () => {
    it('agrees with the browser for every padding length', async () => {
        for (const length of [
            0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 1000,
        ]) {
            const bytes = new TextEncoder().encode('é'.repeat(length));
            const digest = await crypto.subtle.digest('SHA-256', bytes);

            expect(sha256Hex(bytes)).toBe(
                Array.from(new Uint8Array(digest), (byte) =>
                    byte.toString(16).padStart(2, '0'),
                ).join(''),
            );
        }
    });
});
