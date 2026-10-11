import { browser } from 'wxt/browser';

/**
 * Asks the Stashlist at `instance` for a token through the browser's sign-in window: the person signs in
 * there if needed, approves, and the token comes back in the fragment of the address the browser reserves for
 * this extension. Returns null when the person cancelled or closed the window.
 */
export async function connect(instance: string): Promise<string | null> {
    const state = randomState();
    const url = new URL('/connect/extension', instance);
    url.searchParams.set('redirect_uri', browser.identity.getRedirectURL());
    url.searchParams.set('state', state);

    let returned: string | undefined;

    try {
        returned = await browser.identity.launchWebAuthFlow({
            url: url.toString(),
            interactive: true,
        });
    } catch {
        // Closing the window is how people cancel.
        return null;
    }

    return tokenFrom(returned, state);
}

/** The token in the address the sign-in window ended on; null for a denial or an answer to another request. */
export function tokenFrom(
    returned: string | undefined,
    state: string,
): string | null {
    if (returned === undefined) {
        return null;
    }

    const fragment = new URLSearchParams(new URL(returned).hash.slice(1));

    return fragment.get('state') === state ? fragment.get('token') : null;
}

function randomState(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(24));

    return btoa(String.fromCharCode(...bytes))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');
}
