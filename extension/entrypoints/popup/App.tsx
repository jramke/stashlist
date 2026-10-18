import { TagField } from '@/components/tag-field';
import { Button, Input, Label, Note } from '@/components/ui';
import type { Client } from '@/lib/api';
import { highlightSelection } from '@/lib/highlights/create';
import { highlightsOfPage, removeHighlight } from '@/lib/highlights/store';
import type { StoredHighlight } from '@/lib/highlights/types';
import { capturePage, isStashable } from '@/lib/page';
import { buildSaveRequest } from '@/lib/payload';
import { rememberSaved } from '@/lib/saved';
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
    tab: { id: number | undefined; url: string };
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
    const [highlights, setHighlights] = useState<StoredHighlight[]>([]);
    const [marking, setMarking] = useState(false);
    const [highlightProblem, setHighlightProblem] = useState<string | null>(
        null,
    );
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

                setHighlights(await highlightsOfPage(tab.url));
                setEdits({
                    title: page.title,
                    tags: settings.defaults.tags,
                    collectionIds: settings.defaults.collectionIds,
                });
                setState({
                    step: 'ready',
                    loaded: {
                        client,
                        tab: { id: tab.id, url: tab.url },
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

            await rememberSaved(result.url);
            setState({ step: 'saved', loaded, result });
            setTimeout(() => window.close(), 1800);
        } catch (error) {
            setProblem(explain(error));
            setState({ step: 'ready', loaded });
        }
    }

    async function mark(): Promise<void> {
        setHighlightProblem(null);
        setMarking(true);

        try {
            await highlightSelection(loaded.tab);
            setHighlights(await highlightsOfPage(loaded.tab.url));
        } catch (error) {
            setHighlightProblem(explain(error));
        } finally {
            setMarking(false);
        }
    }

    async function unmark(highlight: StoredHighlight): Promise<void> {
        setHighlightProblem(null);

        try {
            await loaded.client.deleteHighlight(highlight.id);
            await removeHighlight(highlight.id);
            setHighlights(await highlightsOfPage(loaded.tab.url));
        } catch (error) {
            setHighlightProblem(explain(error));
        }
    }

    if (state.step === 'saved') {
        return (
            <Shell>
                <Note>
                    {state.result.created ? 'Stashed.' : 'Already stashed.'}
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
                {saving ? 'Stashing…' : 'Stash'}
            </Button>

            <section className="grid gap-2 border-t pt-3">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xs font-medium text-muted-foreground">
                        Highlights on this page
                    </h2>
                    <Button
                        variant="outline"
                        onClick={() => void mark()}
                        disabled={marking}
                    >
                        Highlight selection
                    </Button>
                </div>

                <ul className="grid gap-1.5">
                    {highlights.map((highlight) => (
                        <li
                            key={highlight.id}
                            className="flex items-start gap-2 text-sm"
                        >
                            <span className="line-clamp-2 flex-1">
                                {highlight.text}
                            </span>
                            <button
                                type="button"
                                aria-label="Remove highlight"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => void unmark(highlight)}
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ul>

                {highlightProblem !== null && (
                    <Note tone="error">{highlightProblem}</Note>
                )}
            </section>
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
