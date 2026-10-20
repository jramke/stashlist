import { isAutoStashing, setAutoStash } from '@/lib/auto-stash/access';
import { PLATFORMS, type Platform } from '@/lib/auto-stash/platforms';
import { useEffect, useState } from 'react';

/** "Stash when I save": on for every site until the person unticks it. */
export function AutoStash() {
    const [on, setOn] = useState<Record<string, boolean>>({});

    useEffect(() => {
        void Promise.all(
            PLATFORMS.map(
                async (platform) =>
                    [platform.id, await isAutoStashing(platform)] as const,
            ),
        ).then((entries) => setOn(Object.fromEntries(entries)));
    }, []);

    async function toggle(platform: Platform, checked: boolean): Promise<void> {
        setOn({ ...on, [platform.id]: checked });
        await setAutoStash(platform, checked);
    }

    return (
        <section className="grid gap-3">
            <h2 className="text-sm font-medium">Stash when I save</h2>

            <p className="text-sm text-muted-foreground">
                When you save something on one of these sites, it is stashed
                too. Only the thing you saved is sent to Stashlist, at the
                moment you press the button. Untick a site to stop.
            </p>

            {PLATFORMS.map((platform) => (
                <label
                    key={platform.id}
                    className="flex items-start gap-2 text-sm"
                >
                    <input
                        type="checkbox"
                        className="mt-1"
                        checked={on[platform.id] ?? true}
                        onChange={(event) =>
                            void toggle(platform, event.target.checked)
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
        </section>
    );
}
