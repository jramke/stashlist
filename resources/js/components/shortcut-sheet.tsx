import { Keys } from '@/components/keys';
import { ShortcutList } from '@/components/shortcut-list';
import { shortcuts } from '@/routes';
import { Link } from '@inertiajs/react';

/**
 * Every action of the app on one inline panel, with its keys, read from the catalog (`commands/catalog.ts`), so
 * what it says is what the keys do. It opens with `?` and is not a dialog: the page stays usable. The whole list,
 * with a few words on each key, is the shortcuts page.
 */
export function ShortcutSheet({ onClose }: { onClose: () => void }) {
    return (
        <section
            aria-label="Keyboard shortcuts"
            className="fixed inset-x-4 bottom-4 z-50 mx-auto max-h-[70svh] max-w-2xl animate-panel-in overflow-y-auto rounded-2xl border bg-popover p-5 shadow-xl"
        >
            <div className="mb-4 flex items-center gap-4">
                <h2 className="text-sm font-medium">Keyboard shortcuts</h2>
                <Link
                    href={shortcuts()}
                    onClick={onClose}
                    className="rounded text-xs text-muted-foreground underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                    With explanations
                </Link>
                <button
                    type="button"
                    onClick={onClose}
                    className="ml-auto inline-flex items-center gap-1.5 rounded px-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                    Close <Keys hotkey="Escape" />
                </button>
            </div>

            <ShortcutList />
        </section>
    );
}
