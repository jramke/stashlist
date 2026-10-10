import { storage } from 'wxt/utils/storage';
import type { Defaults } from './types';

/** The hosted Stashlist. Any self-hosted instance can be set on the options page. */
export const DEFAULT_INSTANCE = 'https://stashlist.app';

export const NO_DEFAULTS: Defaults = {
    tags: [],
    collectionIds: [],
    screenshot: true,
};

// The token stays on this device ("local"); the rest follows the browser account ("sync").
const instanceItem = storage.defineItem<string>('sync:instance', {
    fallback: DEFAULT_INSTANCE,
});
const tokenItem = storage.defineItem<string>('local:token', { fallback: '' });
const defaultsItem = storage.defineItem<Defaults>('sync:defaults', {
    fallback: NO_DEFAULTS,
});

export type Settings = { instance: string; token: string; defaults: Defaults };

export async function loadSettings(): Promise<Settings> {
    const [instance, token, defaults] = await Promise.all([
        instanceItem.getValue(),
        tokenItem.getValue(),
        defaultsItem.getValue(),
    ]);

    return { instance, token, defaults: { ...NO_DEFAULTS, ...defaults } };
}

export async function saveSettings(settings: Settings): Promise<void> {
    await Promise.all([
        instanceItem.setValue(normalizeInstance(settings.instance)),
        tokenItem.setValue(settings.token.trim()),
        defaultsItem.setValue(settings.defaults),
    ]);
}

/**
 * The address of an instance as it is stored: https unless the person typed http (a local one), no path, no
 * trailing slash. Returns the default for text that is no address.
 */
export function normalizeInstance(input: string): string {
    const typed = input.trim();

    if (typed === '') {
        return DEFAULT_INSTANCE;
    }

    try {
        const url = new URL(
            /^https?:\/\//i.test(typed) ? typed : `https://${typed}`,
        );

        return url.origin;
    } catch {
        return DEFAULT_INSTANCE;
    }
}

/** Whether the extension is set up well enough to try to save. */
export function isConfigured(settings: Settings): boolean {
    return settings.token.trim() !== '';
}
