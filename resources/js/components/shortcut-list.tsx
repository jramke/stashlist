import { actions } from '@/commands/actions';
import type { ActionDef, Category } from '@/commands/catalog';
import { useKeysReady } from '@/commands/hooks';
import { Kbd } from '@/components/kbd';
import { Keys } from '@/components/keys';
import { cn } from '@/lib/utils';

const categories: Category[] = [
    'Anywhere',
    'The box',
    'Your stashes',
    'One stash',
];

/** The keys of one action: a group of caps for each of its hotkeys, or the caps the catalog says to show. */
function KeysOf({ action }: { action: ActionDef }) {
    const ready = useKeysReady();

    if (!ready) {
        return null;
    }

    if (action.show !== undefined) {
        return (
            <span className="inline-flex gap-1">
                {action.show.flatMap((hotkey) =>
                    actions
                        .caps(hotkey)
                        .map((cap, index) => (
                            <Kbd key={`${hotkey}${index}`}>{cap}</Kbd>
                        )),
                )}
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5">
            {action.hotkeys.map((hotkey, index) => (
                <span key={hotkey} className="inline-flex items-center gap-1.5">
                    {index > 0 && (
                        <span className="text-xs text-muted-foreground">
                            or
                        </span>
                    )}
                    <Keys hotkey={hotkey} />
                </span>
            ))}
        </span>
    );
}

/**
 * Every action of the app with its keys, in the order of the catalog (`commands/catalog.ts`), so what it says is
 * what the keys do. With `descriptions`, the sentence on an action goes under its name.
 */
export function ShortcutList({
    descriptions,
    className,
}: {
    descriptions?: Record<string, string>;
    className?: string;
}) {
    return (
        <div className={cn('grid gap-6 sm:grid-cols-2', className)}>
            {categories.map((category) => (
                <div key={category} className="grid content-start gap-2">
                    <h3 className="text-xs text-muted-foreground">
                        {category}
                    </h3>
                    <ul
                        className={cn(
                            'grid text-sm',
                            descriptions === undefined ? 'gap-1.5' : 'gap-3',
                        )}
                    >
                        {actions
                            .list()
                            .filter(
                                (action) =>
                                    action.category === category &&
                                    action.hidden !== true,
                            )
                            .map((action) => (
                                <li key={action.id}>
                                    <div className="flex items-center gap-3">
                                        <span className="min-w-0 flex-1">
                                            {action.label}
                                        </span>
                                        <span className="shrink-0">
                                            <KeysOf action={action} />
                                        </span>
                                    </div>
                                    {descriptions?.[action.id] !==
                                        undefined && (
                                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                            {descriptions[action.id]}
                                        </p>
                                    )}
                                </li>
                            ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
