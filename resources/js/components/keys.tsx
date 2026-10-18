import { actions } from '@/commands/actions';
import type { ActionId } from '@/commands/catalog';
import { useKeysReady } from '@/commands/hooks';
import { Kbd } from '@/components/kbd';

/** The keys of an action (or of one hotkey) as key caps, in the notation of this machine: Cmd on a Mac, Ctrl elsewhere. */
export function Keys({
    action,
    hotkey,
    className,
}: {
    action?: ActionId;
    hotkey?: string;
    className?: string;
}) {
    const ready = useKeysReady();
    const keys =
        hotkey ??
        (action === undefined ? undefined : actions.hotkeysOf(action)[0]);

    if (!ready || keys === undefined) {
        return null;
    }

    return (
        <span className="inline-flex gap-1">
            {actions.caps(keys).map((cap, index) => (
                <Kbd key={index} className={className}>
                    {cap}
                </Kbd>
            ))}
        </span>
    );
}
