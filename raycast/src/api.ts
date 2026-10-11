import { getPreferenceValues } from '@raycast/api';

export type Stash = {
    id: number;
    type: 'link' | 'note' | 'image' | 'color';
    url: string | null;
    title: string;
    summary: string | null;
    tags: string[];
    web_url: string;
    thumbnail_url: string | null;
    created_at: string;
};

type Preferences = { instance: string; token: string };

function config(): { base: string; headers: Record<string, string> } {
    const { instance, token } = getPreferenceValues<Preferences>();

    return {
        base: instance.trim().replace(/\/+$/, ''),
        headers: {
            Authorization: `Bearer ${token.trim()}`,
            Accept: 'application/json',
        },
    };
}

/** The address and headers of a request to the API, for `useFetch`. */
export function endpoint(path: string): {
    url: string;
    headers: Record<string, string>;
} {
    const { base, headers } = config();

    return { url: `${base}/api/v1/${path}`, headers };
}

/** Saves a link. Returns whether it was new; a link saved before answers 200 with the stash that exists. */
export async function saveLink(
    url: string,
): Promise<{ created: boolean; stash: Stash }> {
    const { url: address, headers } = endpoint('stashes');
    const response = await fetch(address, {
        method: 'POST',
        headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ url }),
    });

    if (response.status === 401) {
        throw new Error('The token is not valid. Check it in the preferences.');
    }

    if (response.status === 422) {
        throw new Error('That is not a link Stashlist can save.');
    }

    if (!response.ok) {
        throw new Error(`Stashlist answered ${response.status}.`);
    }

    return {
        created: response.status === 201,
        stash: (await response.json()) as Stash,
    };
}
