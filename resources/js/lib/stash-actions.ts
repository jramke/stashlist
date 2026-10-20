import { notify } from '@/lib/toast';
import type { Stash } from '@/machines/stash-card';
import { body } from '@/routes/stashes';

/** What "Copy" copies for a stash, and what the menu calls it. */
export type CopyAs = { what: 'link' | 'color' | 'text'; label: string };

const isWebAddress = (address: string | null): address is string =>
    address !== null && /^https?:\/\//i.test(address);

/** Whether the stash has an address of its own to open. */
export function hasLink(stash: Stash): boolean {
    return isWebAddress(stash.url);
}

/** Opens the address of a stash in a new tab, if it has one. */
export function openLink(stash: Stash): boolean {
    if (!isWebAddress(stash.url)) {
        return false;
    }

    window.open(stash.url, '_blank', 'noopener,noreferrer');

    return true;
}

/** What copying this stash would copy: its address, its color code or its text. Null when there is nothing. */
export function copyOf(stash: Stash): CopyAs | null {
    if (isWebAddress(stash.url)) {
        return { what: 'link', label: 'Copy link' };
    }

    if (stash.body === null || stash.body === '') {
        return null;
    }

    if (stash.type === 'color') {
        return { what: 'color', label: 'Copy color' };
    }

    return stash.type === 'note' ? { what: 'text', label: 'Copy text' } : null;
}

const COPIED = { link: 'Link', color: 'Color', text: 'Text' } as const;

/** The whole text of a note: the feed only carries the start of a long one. */
async function wholeText(id: number): Promise<string> {
    const response = await fetch(body(id).url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error(`The text of stash ${id} could not be read.`);
    }

    const found: { body: string | null } = await response.json();

    return found.body ?? '';
}

/** Puts the link, the color or the text of a stash on the clipboard and says so. */
export async function copyStash(stash: Stash): Promise<boolean> {
    const copy = copyOf(stash);

    if (copy === null) {
        return false;
    }

    try {
        if (copy.what === 'text' && stash.body_cut) {
            // Safari wants the clipboard written inside the key press or click, so the request is handed over as a promise.
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/plain': wholeText(stash.id).then(
                        (text) => new Blob([text], { type: 'text/plain' }),
                    ),
                }),
            ]);
        } else {
            await navigator.clipboard.writeText(
                copy.what === 'link' ? (stash.url ?? '') : (stash.body ?? ''),
            );
        }
    } catch {
        notify('error', 'This could not be copied.', { duration: 2500 });

        return false;
    }

    notify('message', `${COPIED[copy.what]} copied`, { duration: 1500 });

    return true;
}
