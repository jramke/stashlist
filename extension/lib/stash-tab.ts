import { browser } from 'wxt/browser';
import { ApiError, createClient, Unauthorized, type Client } from './api';
import { capturePage, isStashable } from './page';
import { buildSaveRequest, quickEdits } from './payload';
import { rememberSaved } from './saved';
import { captureScreenshot } from './screenshot';
import { isConfigured, loadSettings, type Settings } from './settings';
import type { SaveRequest, SaveResult } from './types';

const SCREENSHOT_LIMIT = 2 * 1024 * 1024;

export class NotConfigured extends Error {
    constructor() {
        super('Add your Stashlist token on the options page first.');
        this.name = 'NotConfigured';
    }
}

export class NotStashable extends Error {
    constructor() {
        super('This page cannot be stashed.');
        this.name = 'NotStashable';
    }
}

/** The person asked for a highlight and there is no passage to mark. */
export class NotHighlightable extends Error {
    constructor(reason: 'nothing' | 'too-long') {
        super(
            reason === 'too-long'
                ? 'That passage is too long to highlight. Select a shorter one.'
                : 'Select some text on the page first.',
        );
        this.name = 'NotHighlightable';
    }
}

/** A client for the instance and token in the settings, or an error that says what is missing. */
export async function connect(): Promise<{
    client: Client;
    settings: Settings;
}> {
    const settings = await loadSettings();

    if (!isConfigured(settings)) {
        throw new NotConfigured();
    }

    return {
        client: createClient({
            instance: settings.instance,
            token: settings.token,
        }),
        settings,
    };
}

export function version(): string {
    return browser.runtime.getManifest().version;
}

/**
 * Stashes the page in a tab with the person's defaults and no questions: the keyboard shortcut and the menu.
 */
export async function stashTab(tab: {
    id?: number | undefined;
    url?: string | undefined;
    title?: string | undefined;
    windowId?: number | undefined;
}): Promise<SaveResult> {
    const { client, settings } = await connect();

    if (!isStashable(tab.url)) {
        throw new NotStashable();
    }

    const page = await capturePage(tab);
    const screenshot = settings.defaults.screenshot
        ? await captureScreenshot(tab.windowId, SCREENSHOT_LIMIT)
        : null;

    return remember(
        await client.save(
            buildSaveRequest(
                page,
                quickEdits(page, settings.defaults),
                version(),
                screenshot,
            ),
            crypto.randomUUID(),
        ),
    );
}

/** Stashes something that is not the page itself: a link or an image the person pointed at. */
export async function stashThing(request: SaveRequest): Promise<SaveResult> {
    const { client, settings } = await connect();

    return remember(
        await client.save(
            {
                tags: settings.defaults.tags,
                collectionIds: settings.defaults.collectionIds,
                ...request,
            },
            crypto.randomUUID(),
        ),
    );
}

/** Lets the icon's check know the page is saved without waiting for the next sync. */
async function remember(result: SaveResult): Promise<SaveResult> {
    await rememberSaved(result.url);

    return result;
}

/** A sentence for a person about what went wrong. */
export function explain(error: unknown): string {
    if (
        error instanceof ApiError ||
        error instanceof NotConfigured ||
        error instanceof NotStashable ||
        error instanceof NotHighlightable
    ) {
        return error.message;
    }

    return 'Something went wrong. Try again.';
}

/** Whether the token should be replaced, as opposed to the request being tried again. */
export function needsNewToken(error: unknown): boolean {
    return error instanceof Unauthorized || error instanceof NotConfigured;
}
