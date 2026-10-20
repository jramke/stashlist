import { whenIdle } from '@/lib/idle';
import { cn } from '@/lib/utils';
import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState, type ComponentType } from 'react';

export type AccountMenuPopupProps = {
    name: string;
    className?: string | undefined;
    /** The person pressed the button before the menu was there: it opens as soon as it is. */
    defaultOpen: boolean;
};

/** The button behind the initial of the person; the menu's trigger wears the same look. */
export const accountButtonClass =
    'flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground uppercase transition-[transform,color,background-color] duration-150 outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 data-[popup-open]:bg-foreground/10 data-[popup-open]:text-foreground';

type Popup = ComponentType<AccountMenuPopupProps>;

/** Fetches the menu, once; the module is kept for the next page. The compiler cannot lower `import()` inside a component. */
function loadPopup(): Promise<Popup> {
    return import('./account-menu-popup').then(
        (module) => (loaded = module.AccountMenuPopup),
    );
}

/** The menu once it is loaded, kept for the next page: the frame mounts again and must not flash the plain button. */
let loaded: Popup | null = null;

/**
 * The few places that are not the feed, behind the initial of the person. The menu itself is Base UI's, which is
 * a chunk of its own that is fetched when the browser is idle after the page (`account-menu-popup.tsx`): until
 * then this is the plain button, and a press on it opens the menu as soon as it is there.
 */
export function AccountMenu({ className }: { className?: string }) {
    const { auth } = usePage().props;
    const name = auth.user?.name ?? '';
    const [Popup, setPopup] = useState<Popup | null>(() => loaded);
    const [pressed, setPressed] = useState(false);
    const button = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (Popup !== null) {
            return;
        }

        let mounted = true;
        const fetchPopup = () =>
            void loadPopup().then((component) => {
                if (!mounted) {
                    return;
                }

                // The menu's own button replaces this one: somebody who tabbed onto it keeps the focus.
                const focused = document.activeElement === button.current;

                setPopup(() => component);

                if (focused) {
                    queueMicrotask(() =>
                        document
                            .querySelector<HTMLElement>('[aria-label=Menu]')
                            ?.focus(),
                    );
                }
            });

        if (pressed) {
            fetchPopup();

            return () => {
                mounted = false;
            };
        }

        const cancel = whenIdle(fetchPopup);

        return () => {
            mounted = false;
            cancel();
        };
    }, [Popup, pressed]);

    if (Popup !== null) {
        return (
            <Popup name={name} className={className} defaultOpen={pressed} />
        );
    }

    return (
        <button
            ref={button}
            type="button"
            aria-label="Menu"
            aria-haspopup="menu"
            aria-expanded={false}
            onClick={() => setPressed(true)}
            className={cn(accountButtonClass, className)}
        >
            {name.slice(0, 1) || '·'}
        </button>
    );
}
