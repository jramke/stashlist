import { actions } from '@/commands/actions';
import type { ActionDef, Category } from '@/commands/catalog';
import { useKeysReady } from '@/commands/hooks';
import { Kbd } from '@/components/kbd';
import { Keys } from '@/components/keys';

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
 * Every action of the app on one inline panel, with its keys, read from the catalog (`commands/catalog.ts`), so
 * what it says is what the keys do. It opens with `?` and is not a dialog: the page stays usable.
 */
export function ShortcutSheet({ onClose }: { onClose: () => void }) {
    return (
        <section
            aria-label="Keyboard shortcuts"
            className="fixed inset-x-4 bottom-4 z-50 mx-auto max-h-[70svh] max-w-2xl animate-panel-in overflow-y-auto rounded-2xl border bg-popover p-5 shadow-xl"
        >
            <div className="mb-4 flex items-center">
                <h2 className="text-sm font-medium">Keyboard shortcuts</h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="ml-auto inline-flex items-center gap-1.5 rounded px-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                    Close <Keys hotkey="Escape" />
                </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                {categories.map((category) => (
                    <div key={category} className="grid content-start gap-2">
                        <h3 className="text-xs text-muted-foreground">
                            {category}
                        </h3>
                        <ul className="grid gap-1.5 text-sm">
                            {actions
                                .list()
                                .filter(
                                    (action) =>
                                        action.category === category &&
                                        action.hidden !== true,
                                )
                                .map((action) => (
                                    <li
                                        key={action.id}
                                        className="flex items-center gap-3"
                                    >
                                        <span className="min-w-0 flex-1 truncate">
                                            {action.label}
                                        </span>
                                        <span className="shrink-0">
                                            <KeysOf action={action} />
                                        </span>
                                    </li>
                                ))}
                        </ul>
                    </div>
                ))}
            </div>
        </section>
    );
}
