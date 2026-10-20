import type { ActionId } from '@/commands/catalog';
import { Keys } from '@/components/keys';
import { focusGrid } from '@/lib/keys';
import { copyOf, copyStash, hasLink, openLink } from '@/lib/stash-actions';
import { cn } from '@/lib/utils';
import type { Stash } from '@/machines/stash-card';
import { ContextMenu } from '@base-ui/react/context-menu';
import type { ReactNode } from 'react';

/** Where the menu comes from: the point of the click, or the card the keyboard is on. */
export type MenuAnchor = Element | { getBoundingClientRect: () => DOMRect };

export type StashMenuProps = {
    stash: Stash;
    anchor: MenuAnchor;
    onClose: () => void;
    onOpen: (id: number) => void;
    onDelete: (id: number) => void;
};

const itemClass =
    'flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 outline-none select-none data-[highlighted]:bg-muted';

/**
 * The menu of one stash (Base UI's context menu): everything the keys do on a card, for the pointer. The feed
 * decides when it opens, with a right-click, a long press or the Menu key, and hands in the card and the place
 * (`hooks/use-stash-menu.tsx`); this is a chunk of its own that arrives after the page.
 */
export function StashMenu({
    stash,
    anchor,
    onClose,
    onOpen,
    onDelete,
}: StashMenuProps) {
    const copy = copyOf(stash);

    return (
        <ContextMenu.Root
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <ContextMenu.Portal>
                <ContextMenu.Positioner
                    anchor={anchor}
                    sideOffset={anchor instanceof Element ? 6 : undefined}
                    className="z-50"
                >
                    <ContextMenu.Popup
                        // The keyboard goes back to the cards, where the person was.
                        finalFocus={() => {
                            focusGrid();

                            return false;
                        }}
                        className="w-56 origin-(--transform-origin) animate-panel-in rounded-xl border bg-popover p-1.5 text-sm shadow-lg outline-none"
                    >
                        <Entry
                            action="card.open"
                            onSelect={() => onOpen(stash.id)}
                        >
                            Open
                        </Entry>
                        {hasLink(stash) && (
                            <Entry
                                action="card.open-link"
                                onSelect={() => openLink(stash)}
                            >
                                Open link
                            </Entry>
                        )}
                        {copy !== null && (
                            <Entry
                                action="card.copy"
                                onSelect={() => void copyStash(stash)}
                            >
                                {copy.label}
                            </Entry>
                        )}

                        <ContextMenu.Separator className="my-1 h-px bg-border" />

                        <Entry
                            action="card.delete"
                            onSelect={() => onDelete(stash.id)}
                            danger
                        >
                            Delete
                        </Entry>
                    </ContextMenu.Popup>
                </ContextMenu.Positioner>
            </ContextMenu.Portal>
        </ContextMenu.Root>
    );
}

function Entry({
    action,
    onSelect,
    danger,
    children,
}: {
    action: ActionId;
    onSelect: () => void;
    danger?: boolean;
    children: ReactNode;
}) {
    return (
        <ContextMenu.Item
            onClick={onSelect}
            className={cn(itemClass, danger && 'text-destructive')}
        >
            {children}
            <span className="ml-auto">
                <Keys action={action} />
            </span>
        </ContextMenu.Item>
    );
}
