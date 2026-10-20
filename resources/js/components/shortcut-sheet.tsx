import { Keys } from '@/components/keys';
import { ShortcutList } from '@/components/shortcut-list';
import { shortcuts } from '@/routes';
import { Drawer } from '@base-ui/react/drawer';
import { Link } from '@inertiajs/react';

/**
 * Every action of the app in a drawer from the bottom (Base UI's), with its keys, read from the catalog
 * (`commands/catalog.ts`), so what it says is what the keys do. It opens with `?`, closes with `?` or Escape, a click
 * outside or a swipe down. The whole list, with a few words on each key, is the shortcuts page.
 */
export function ShortcutSheet({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    return (
        <Drawer.Root
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    onClose();
                }
            }}
        >
            <Drawer.Portal>
                <Drawer.Backdrop className="fixed inset-0 z-50 bg-black opacity-[calc(var(--backdrop-opacity)*(1-var(--drawer-swipe-progress)))] transition-opacity duration-300 ease-out [--backdrop-opacity:0.08] data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0" />
                <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
                    {/* The popup reaches 3rem below the screen, so a swipe that overshoots shows no gap. */}
                    <Drawer.Popup className="pop -mb-12 max-h-[calc(80svh+3rem)] w-full max-w-2xl [transform:translateY(var(--drawer-swipe-movement-y))] touch-auto overflow-y-auto overscroll-contain rounded-t-2xl rounded-b-none px-5 pt-2.5 pb-[calc(1.25rem+3rem+env(safe-area-inset-bottom,0px))] text-sm transition-transform duration-300 ease-out data-ending-style:[transform:translateY(calc(100%-3rem+2px))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*300ms)] data-starting-style:[transform:translateY(calc(100%-3rem+2px))] data-swiping:select-none motion-reduce:duration-0">
                        <Drawer.Content>
                            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-foreground/15" />

                            <div className="mb-4 flex items-center gap-4">
                                <Drawer.Title className="text-sm font-medium">
                                    Keyboard shortcuts
                                </Drawer.Title>
                                <Link
                                    href={shortcuts()}
                                    onClick={onClose}
                                    className="rounded text-xs text-muted-foreground underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                                >
                                    With explanations
                                </Link>
                                <Drawer.Close className="ml-auto inline-flex items-center gap-1.5 rounded px-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
                                    Close <Keys hotkey="Escape" />
                                </Drawer.Close>
                            </div>

                            <ShortcutList />
                        </Drawer.Content>
                    </Drawer.Popup>
                </Drawer.Viewport>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
