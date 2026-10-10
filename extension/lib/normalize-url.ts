/**
 * "The same page" as the server sees it (App\Support\UrlNormalizer). The extension looks highlights up by the
 * hash of this form, so it must come out exactly as on the server: both are tested with
 * tests/fixtures/url-normalization.json. Change the rules and that file together.
 *
 * The rules: http and https only, no credentials, scheme and host in lower case, an internationalized host as
 * punycode, no trailing dot or default port, no fragment, no tracking parameters (utm_*, fbclid, gclid, mc_*),
 * an empty path becomes "/", and anything outside printable ASCII in path and query is percent-encoded as UTF-8.
 * Nothing else is touched: dot segments and the case of percent escapes stay as they are.
 */

import { sha256Hex } from './sha256';

const URL_PATTERN =
    /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(?:\?([^#]*))?(?:#.*)?$/;
const AUTHORITY_PATTERN = /^(?:([^@]*)@)?(\[[^\]]*\]|[^:]*)(?::(\d*))?$/;
const TRACKING_PARAMETER = /^(utm_.*|fbclid|gclid|mc_.*)$/;

/**
 * @returns the normalized address, or null when this is not a plain web address
 */

export function normalizeUrl(input: string): string | null {
    let url = input.trim();

    if (url.startsWith('//')) {
        url = `https:${url}`;
    }

    const parts = URL_PATTERN.exec(url);

    if (parts === null) {
        return null;
    }

    const scheme = (parts[1] ?? '').toLowerCase();
    const authority = AUTHORITY_PATTERN.exec(parts[2] ?? '');

    if (
        (scheme !== 'http' && scheme !== 'https') ||
        authority === null ||
        authority[1] !== undefined
    ) {
        return null;
    }

    const host = normalizeHost(authority[2] ?? '');
    const port = parsePort(authority[3]);

    if (host === null || port === false) {
        return null;
    }

    const path = encodeNonAscii(parts[3] ?? '');
    const query = withoutTracking(encodeNonAscii(parts[4] ?? ''));
    const defaultPort = scheme === 'https' ? 443 : 80;

    return (
        `${scheme}://${host}${port === null || port === defaultPort ? '' : `:${port}`}` +
        (path === '' ? '/' : path) +
        (query === '' ? '' : `?${query}`)
    );
}

/** The 64 hex characters the server keeps as `url_hash` (as a hex string). */
export async function urlHash(normalized: string): Promise<string> {
    const bytes = new TextEncoder().encode(normalized);

    // Not there in a content script on an http page (no secure context).
    if (globalThis.crypto?.subtle === undefined) {
        return sha256Hex(bytes);
    }

    const digest = await crypto.subtle.digest('SHA-256', bytes);

    return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0'),
    ).join('');
}

function normalizeHost(host: string): string | null {
    const lowered = host.toLowerCase().replace(/\.+$/, '');

    if (lowered === '') {
        return null;
    }

    // Plain ASCII hosts, including IPv6 literals in brackets, are kept as they are.
    if (/^[\x21-\x7e]+$/.test(lowered)) {
        return lowered;
    }

    try {
        return new URL(`http://${lowered}`).hostname;
    } catch {
        return null;
    }
}

/** null for no port, false for one that is no port. */
function parsePort(port: string | undefined): number | null | false {
    if (port === undefined || port === '') {
        return null;
    }

    const number = Number(port);

    return number <= 65535 ? number : false;
}

function encodeNonAscii(value: string): string {
    return Array.from(value, (character) =>
        /[\x21-\x7e]/.test(character)
            ? character
            : encodeURIComponent(character),
    ).join('');
}

function withoutTracking(query: string): string {
    return query
        .split('&')
        .filter(
            (pair) =>
                pair !== '' &&
                !TRACKING_PARAMETER.test(
                    (pair.split('=', 1)[0] ?? '').toLowerCase(),
                ),
        )
        .join('&');
}
