import { Note } from '@/components/ui';
import {
    isAutoStashing,
    turnOffAutoStash,
    turnOnAutoStash,
} from '@/lib/auto-stash/access';
import { PLATFORMS, type Platform } from '@/lib/auto-stash/platforms';
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

/** "Stash when I save": a checkbox for every site and one for all of them. Off until the person ticks it. */
export function AutoStash() {
    const [on, setOn] = useState<Record<string, boolean>>({});
    const [refused, setRefused] = useState<Platform[]>([]);

    useEffect(() => {
        const read = (): void => {
            void Promise.all(
                PLATFORMS.map(
                    async (platform) =>
                        [platform.id, await isAutoStashing(platform)] as const,
                ),
            ).then((entries) => setOn(Object.fromEntries(entries)));
        };

        read();
        // The choices live in storage (also changed in another options tab) and the browser's own page can take a
        // permission away.
        browser.storage.onChanged.addListener(read);
        browser.permissions.onAdded.addListener(read);
        browser.permissions.onRemoved.addListener(read);

        return () => {
            browser.storage.onChanged.removeListener(read);
            browser.permissions.onAdded.removeListener(read);
            browser.permissions.onRemoved.removeListener(read);
        };
    }, []);

    /** Turns sites on or off in one go: one question to the browser, whatever the number of sites. */
    async function toggle(
        platforms: Platform[],
        checked: boolean,
    ): Promise<void> {
        setRefused([]);

        if (!checked) {
            await turnOffAutoStash(platforms);
            setOn({
                ...on,
                ...Object.fromEntries(platforms.map(({ id }) => [id, false])),
            });

            return;
        }

        const granted = await turnOnAutoStash(platforms);

        setOn({
            ...on,
            ...Object.fromEntries(platforms.map(({ id }) => [id, granted])),
        });

        if (!granted) {
            setRefused(platforms);
        }
    }

    const count = PLATFORMS.filter(({ id }) => on[id] === true).length;

    return (
        <section className="grid gap-3">
            <h2 className="text-sm font-medium">Stash when I save</h2>

            <p className="text-sm text-muted-foreground">
                Stash it too when you save something on a site you turn on here.
                The browser asks to allow the sites you pick. Only the thing you
                saved is sent to Stashlist, when you save it.
            </p>

            <label className="flex items-center gap-2 text-sm font-medium">
                <input
                    type="checkbox"
                    checked={count === PLATFORMS.length}
                    ref={(box) => {
                        if (box !== null) {
                            box.indeterminate =
                                count > 0 && count < PLATFORMS.length;
                        }
                    }}
                    onChange={(event) =>
                        void toggle(PLATFORMS, event.target.checked)
                    }
                />
                All sites
            </label>

            {PLATFORMS.map((platform) => (
                <label
                    key={platform.id}
                    className="flex items-start gap-2 pl-6 text-sm"
                >
                    <input
                        type="checkbox"
                        className="mt-1"
                        checked={on[platform.id] === true}
                        onChange={(event) =>
                            void toggle([platform], event.target.checked)
                        }
                    />
                    <span>
                        {platform.label}
                        <span className="block text-xs text-muted-foreground">
                            {platform.action}
                        </span>
                    </span>
                </label>
            ))}

            {refused.length > 0 && (
                <Note tone="error">
                    Without access to{' '}
                    {refused.map(({ label }) => label).join(', ')} the extension
                    cannot see what you save there.
                </Note>
            )}
        </section>
    );
}
