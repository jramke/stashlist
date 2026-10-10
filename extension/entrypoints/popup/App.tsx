import { TagField } from '@/components/tag-field';
import { Button, Input, Label, Note } from '@/components/ui';
import type { Client } from '@/lib/api';
import { capturePage, isStashable } from '@/lib/page';
import { buildSaveRequest } from '@/lib/payload';
import { captureScreenshot } from '@/lib/screenshot';
import { connect, explain, needsNewToken, version } from '@/lib/stash-tab';
import type {
    Collection,
    Edits,
    Lookup,
    PageCapture,
    SaveResult,
} from '@/lib/types';
import { useEffect, useRef, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';

const SCREENSHOT_LIMIT = 2 * 1024 * 1024;

type Loaded = {
    client: Client;
    instance: string;
    tabWindowId: number | undefined;
    page: PageCapture;
    lookup: Lookup;
    collections: Collection[];
    screenshot: Blob | null;
    screenshotDefault: boolean;
};

type State =
    | { step: 'loading' }
    | { step: 'failed'; message: string; fixToken: boolean }
    | { step: 'ready'; loaded: Loaded }
    | { step: 'saving'; loaded: Loaded }
    | { step: 'saved'; loaded: Loaded; result: SaveResult };

/** The popup: look at what is about to be stashed, change it if you want to, save. */
export function App() {
    const [state, setState] = useState<State>({ step: 'loading' });
    const [edits, setEdits] = useState<Edits>({
        title: '',
        tags: [],
        collectionIds: [],
    });
    const [problem, setProblem] = useState<string | null>(null);
    // One key for this popup: pressing Save again after a failure repeats the same save, not a second one.
    const idempotencyKey = useRef(crypto.randomUUID());

    useEffect(() => {
        void (async () => {
            try {
                const { client, settings } = await connect();
                const tab = await targetTab();

                if (tab === undefined || !isStashable(tab.url)) {
                    setState({
                        step: 'failed',
                        message: 'This page cannot be stashed.',
                        fixToken: false,
                    });

                    return;
                }

                const [page, lookup, collections, screenshot] =
                    await Promise.all([
                        capturePage(tab),
                        client.lookup(tab.url),
                        client.collections(),
                        settings.defaults.screenshot
                            ? captureScreenshot(tab.windowId, SCREENSHOT_LIMIT)
                            : Promise.resolve(null),
                    ]);

                setEdits({
                    title: page.title,
                    tags: settings.defaults.tags,
                    collectionIds: settings.defaults.collectionIds,
                });
                setState({
                    step: 'ready',
                    loaded: {
                        client,
                        instance: settings.instance,
                        tabWindowId: tab.windowId,
                        page,
                        lookup,
                        collections,
                        screenshot,
                        screenshotDefault: settings.defaults.screenshot,
                    },
                });
            } catch (error) {
                setState({
                    step: 'failed',
                    message: explain(error),
                    fixToken: needsNewToken(error),
                });
            }
        })();
    }, []);

    if (state.step === 'loading') {
        return (
            <Shell>
                <Note>Reading the page…</Note>
            </Shell>
        );
    }

    if (state.step === 'failed') {
        return (
            <Shell>
                <Note tone="error">{state.message}</Note>
                {state.fixToken && (
                    <Button
                        variant="outline"
                        onClick={() => void browser.runtime.openOptionsPage()}
                    >
                        Open settings
                    </Button>
                )}
            </Shell>
        );
    }

    const { loaded } = state;
    const saving = state.step === 'saving';

    async function save(): Promise<void> {
        setProblem(null);
        setState({ step: 'saving', loaded });

        try {
            const result = await loaded.client.save(
                buildSaveRequest(
                    loaded.page,
                    edits,
                    version(),
                    loaded.screenshot,
                ),
                idempotencyKey.current,
            );

            setState({ step: 'saved', loaded, result });
            setTimeout(() => window.close(), 1800);
        } catch (error) {
            setProblem(explain(error));
            setState({ step: 'ready', loaded });
        }
    }

    if (state.step === 'saved') {
        return (
            <Shell>
                <Note>
                    {state.result.created
                        ? 'Stashed.'
                        : 'Already in your stashes.'}
                </Note>
                <a
                    className="text-sm underline"
                    href={state.result.webUrl}
                    target="_blank"
                    rel="noreferrer"
                >
                    Open in Stashlist
                </a>
            </Shell>
        );
    }

    return (
        <Shell>
            {loaded.lookup.saved && (
                <Note>
                    Already stashed
                    {loaded.lookup.title === null
                        ? ''
                        : `: ${loaded.lookup.title}`}
                    .{' '}
                    <a
                        className="underline"
                        href={`${loaded.instance}/stashes/${String(loaded.lookup.id)}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Open
                    </a>
                </Note>
            )}

            {loaded.page.imageUrl !== null && (
                <img
                    src={loaded.page.imageUrl}
                    alt=""
                    className="max-h-32 w-full rounded-lg border object-cover"
                    referrerPolicy="no-referrer"
                />
            )}

            <div className="grid gap-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                    id="title"
                    value={edits.title}
                    onChange={(event) =>
                        setEdits({ ...edits, title: event.target.value })
                    }
                />
            </div>

            <div className="grid gap-1.5">
                <Label>Tags</Label>
                <TagField
                    client={loaded.client}
                    tags={edits.tags}
                    onChange={(tags) => setEdits({ ...edits, tags })}
                />
            </div>

            {loaded.collections.length > 0 && (
                <fieldset className="grid gap-1.5">
                    <legend className="text-xs font-medium text-muted-foreground">
                        Collections
                    </legend>
                    {loaded.collections.map((collection) => (
                        <label
                            key={collection.id}
                            className="flex items-center gap-2 text-sm"
                        >
                            <input
                                type="checkbox"
                                checked={edits.collectionIds.includes(
                                    collection.id,
                                )}
                                onChange={(event) =>
                                    setEdits({
                                        ...edits,
                                        collectionIds: event.target.checked
                                            ? [
                                                  ...edits.collectionIds,
                                                  collection.id,
                                              ]
                                            : edits.collectionIds.filter(
                                                  (id) => id !== collection.id,
                                              ),
                                    })
                                }
                            />
                            {collection.name}
                        </label>
                    ))}
                </fieldset>
            )}

            {problem !== null && <Note tone="error">{problem}</Note>}

            <Button onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving…' : 'Stash'}
            </Button>
        </Shell>
    );
}

/**
 * The tab to stash: the active one. The browser tests open the popup as a page of its own, where "active" is the
 * popup itself, and name the tab in the address (?tab=). Web pages cannot open this page, so this opens nothing.
 */
async function targetTab(): Promise<Browser.tabs.Tab | undefined> {
    const named = new URLSearchParams(location.search).get('tab');

    if (named !== null) {
        return browser.tabs.get(Number(named));
    }

    return (await browser.tabs.query({ active: true, currentWindow: true }))[0];
}

function Shell({ children }: { children: React.ReactNode }) {
    return <main className="grid w-[360px] gap-3 p-4">{children}</main>;
}
