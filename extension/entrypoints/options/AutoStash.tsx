import { Note } from '@/components/ui';
import {
    isAutoStashing,
    turnOffAutoStash,
    turnOnAutoStash,
} from '@/lib/auto-stash/access';
import { PLATFORMS, type Platform } from '@/lib/auto-stash/platforms';
import { useEffect, useState } from 'react';

/** "Stash when I save": one checkbox per site, each asking the browser for that one site. */
export function AutoStash() {
    const [on, setOn] = useState<Record<string, boolean>>({});
    const [refused, setRefused] = useState<Platform | null>(null);

    useEffect(() => {
        void Promise.all(
            PLATFORMS.map(
                async (platform) =>
                    [platform.id, await isAutoStashing(platform)] as const,
            ),
        ).then((entries) => setOn(Object.fromEntries(entries)));
    }, []);

    async function toggle(platform: Platform, checked: boolean): Promise<void> {
        setRefused(null);

        if (!checked) {
            await turnOffAutoStash(platform);
            setOn({ ...on, [platform.id]: false });

            return;
        }

        const granted = await turnOnAutoStash(platform);

        setOn({ ...on, [platform.id]: granted });

        if (!granted) {
            setRefused(platform);
        }
    }

    return (
        <section className="grid gap-3">
            <h2 className="text-sm font-medium">Stash when I save</h2>

            <p className="text-sm text-muted-foreground">
                Stash it too when you save something on a site you turn on here.
                Each needs access to that one site. Only the thing you saved is
                sent to Stashlist, when you save it.
            </p>

            {PLATFORMS.map((platform) => (
                <label
                    key={platform.id}
                    className="flex items-start gap-2 text-sm"
                >
                    <input
                        type="checkbox"
                        className="mt-1"
                        checked={on[platform.id] === true}
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

            {refused !== null && (
                <Note tone="error">
                    Without access to {refused.label} the extension cannot see
                    what you save there.
                </Note>
            )}
        </section>
    );
}
