import { Button, Input, Label, Note } from '@/components/ui';
import { createClient } from '@/lib/api';
import { parseTags } from '@/lib/payload';
import {
    DEFAULT_INSTANCE,
    loadSettings,
    NO_DEFAULTS,
    normalizeInstance,
    saveSettings,
} from '@/lib/settings';
import { explain } from '@/lib/stash-tab';
import type { Collection, Defaults } from '@/lib/types';
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

type Status = { tone: 'muted' | 'error'; text: string } | null;

/** Where the person says which Stashlist to talk to, with which token, and what a quick clip does. */
export function App() {
    const [instance, setInstance] = useState(DEFAULT_INSTANCE);
    const [token, setToken] = useState('');
    const [defaults, setDefaults] = useState<Defaults>(NO_DEFAULTS);
    const [tagText, setTagText] = useState('');
    const [collections, setCollections] = useState<Collection[]>([]);
    const [status, setStatus] = useState<Status>(null);

    useEffect(() => {
        void loadSettings().then((settings) => {
            setInstance(settings.instance);
            setToken(settings.token);
            setDefaults(settings.defaults);
            setTagText(settings.defaults.tags.join(', '));

            if (settings.token !== '') {
                void createClient({
                    instance: settings.instance,
                    token: settings.token,
                })
                    .collections()
                    .then(setCollections)
                    .catch(() => setCollections([]));
            }
        });
    }, []);

    async function save(): Promise<void> {
        const address = normalizeInstance(instance);
        const origin = `${new URL(address).origin}/*`;

        setStatus({ tone: 'muted', text: 'Saving…' });

        // A self-hosted instance needs the browser's permission, which can only be asked for right after a click.
        if (!(await browser.permissions.contains({ origins: [origin] }))) {
            if (!(await browser.permissions.request({ origins: [origin] }))) {
                setStatus({
                    tone: 'error',
                    text: `Without access to ${address} the extension cannot save there.`,
                });

                return;
            }
        }

        const next = { ...defaults, tags: parseTags(tagText) };
        await saveSettings({ instance: address, token, defaults: next });
        setInstance(address);
        setDefaults(next);

        try {
            const me = await createClient({ instance: address, token }).me();
            setStatus({
                tone: 'muted',
                text: `Saved. Connected as ${me.name}.`,
            });
            setCollections(
                await createClient({ instance: address, token }).collections(),
            );
        } catch (error) {
            setStatus({ tone: 'error', text: `Saved, but ${explain(error)}` });
        }
    }

    return (
        <main className="mx-auto grid max-w-lg gap-6 p-8">
            <header className="grid gap-1">
                <h1 className="text-xl font-medium">Stashlist</h1>
                <p className="text-sm text-muted-foreground">
                    Press <kbd className="rounded border px-1 text-xs">Alt</kbd>
                    +<kbd className="rounded border px-1 text-xs">Shift</kbd>+
                    <kbd className="rounded border px-1 text-xs">S</kbd> on any
                    page to stash it without opening the popup.
                </p>
            </header>

            <section className="grid gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="instance">Address of your Stashlist</Label>
                    <Input
                        id="instance"
                        value={instance}
                        onChange={(event) => setInstance(event.target.value)}
                        placeholder={DEFAULT_INSTANCE}
                        autoComplete="off"
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="token">Token</Label>
                    <Input
                        id="token"
                        type="password"
                        value={token}
                        onChange={(event) => setToken(event.target.value)}
                        placeholder="1|stl_…"
                        autoComplete="off"
                    />
                    <a
                        className="text-xs underline"
                        href={`${normalizeInstance(instance)}/settings/tokens`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Make a token in Stashlist
                    </a>
                </div>
            </section>

            <section className="grid gap-4">
                <h2 className="text-sm font-medium">What a quick clip does</h2>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={defaults.screenshot}
                        onChange={(event) =>
                            setDefaults({
                                ...defaults,
                                screenshot: event.target.checked,
                            })
                        }
                    />
                    Send a screenshot of the visible part of the page
                </label>

                <div className="grid gap-1.5">
                    <Label htmlFor="tags">Tags to add (comma separated)</Label>
                    <Input
                        id="tags"
                        value={tagText}
                        onChange={(event) => setTagText(event.target.value)}
                        autoComplete="off"
                    />
                </div>

                {collections.length > 0 && (
                    <fieldset className="grid gap-1.5">
                        <legend className="text-xs font-medium text-muted-foreground">
                            Put in these collections
                        </legend>
                        {collections.map((collection) => (
                            <label
                                key={collection.id}
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    type="checkbox"
                                    checked={defaults.collectionIds.includes(
                                        collection.id,
                                    )}
                                    onChange={(event) =>
                                        setDefaults({
                                            ...defaults,
                                            collectionIds: event.target.checked
                                                ? [
                                                      ...defaults.collectionIds,
                                                      collection.id,
                                                  ]
                                                : defaults.collectionIds.filter(
                                                      (id) =>
                                                          id !== collection.id,
                                                  ),
                                        })
                                    }
                                />
                                {collection.name}
                            </label>
                        ))}
                    </fieldset>
                )}
            </section>

            <div className="grid gap-2">
                <Button onClick={() => void save()}>Save and test</Button>
                {status !== null && (
                    <Note tone={status.tone}>{status.text}</Note>
                )}
            </div>
        </main>
    );
}
