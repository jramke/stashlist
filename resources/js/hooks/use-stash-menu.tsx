import type { StashMenuProps } from '@/components/stash-menu';
import { whenIdle } from '@/lib/idle';
import type { Stash } from '@/machines/stash-card';
import {
    useEffect,
    useState,
    type ComponentType,
    type MouseEvent,
    type ReactNode,
} from 'react';

type Open = Pick<StashMenuProps, 'stash' | 'anchor'>;
type Menu = ComponentType<StashMenuProps>;

/** The menu once it is loaded, kept for the next time the feed is shown. */
let loaded: Menu | null = null;

/** Fetches the menu. The compiler cannot lower `import()` inside a hook. */
function loadMenu(): Promise<Menu> {
    return import('@/components/stash-menu').then(
        (module) => (loaded = module.StashMenu),
    );
}

/**
 * The menu of a card, opened by a right-click or a long press (the `contextmenu` event), or by the Menu key or
 * Shift+F10 on the card the keyboard is on (`openHighlighted`, which the `card.menu` action calls). The menu
 * (Base UI's, `components/stash-menu.tsx`) is a chunk of its own that is fetched when the browser is idle after the
 * page (at once for the first click that needs it), so the first visit does not carry it. A click opens the menu at the place of the click; the keyboard opens it at the card.
 * Anywhere else the browser keeps its own menu.
 */
export function useStashMenu({
    stashes,
    highlightedId,
    onHighlight,
    onOpen,
    onDelete,
}: {
    stashes: Stash[];
    /** The card the keyboard is on, if any. */
    highlightedId: () => number | null;
    onHighlight: (id: number) => void;
    onOpen: (id: number) => void;
    onDelete: (id: number) => void;
}): {
    onContextMenu: (event: MouseEvent) => void;
    openHighlighted: () => boolean;
    menu: ReactNode;
} {
    const [Menu, setMenu] = useState<Menu | null>(() => loaded);
    const [open, setOpen] = useState<Open | null>(null);
    const fetchMenu = () =>
        void loadMenu().then((component) => setMenu(() => component));

    useEffect(() => {
        if (loaded !== null) {
            return;
        }

        return whenIdle(fetchMenu);
        // The menu is fetched once.
    }, []);

    /** Opens the menu of the card the keyboard is on, at the card. */
    function openHighlighted(): boolean {
        const id = highlightedId();
        const stash = stashes.find((other) => other.id === id);
        const card =
            id === null
                ? null
                : document.querySelector<HTMLElement>(
                      `[data-stash-id="${id}"]`,
                  );

        if (stash === undefined || card === null) {
            return false;
        }

        fetchMenu();
        onHighlight(stash.id);
        setOpen({ stash, anchor: card });

        return true;
    }

    function onContextMenu(event: MouseEvent) {
        const card =
            event.target instanceof Element
                ? event.target.closest<HTMLElement>('[data-stash-id]')
                : null;
        const stash = stashes.find(
            (other) => String(other.id) === card?.dataset.stashId,
        );

        if (card === null || stash === undefined) {
            // On the gaps of the grid the browser keeps its menu. (The Menu key is a hotkey of its own, `card.menu`.)
            return;
        }

        const { clientX: x, clientY: y } = event;

        event.preventDefault();
        fetchMenu();
        onHighlight(stash.id);
        setOpen({
            stash,
            anchor: {
                getBoundingClientRect: () =>
                    DOMRect.fromRect({ x, y, width: 0, height: 0 }),
            },
        });
    }

    return {
        onContextMenu,
        openHighlighted,
        menu:
            Menu !== null && open !== null ? (
                <Menu
                    key={open.stash.id}
                    stash={open.stash}
                    anchor={open.anchor}
                    onClose={() => setOpen(null)}
                    onOpen={onOpen}
                    onDelete={onDelete}
                />
            ) : null,
    };
}
