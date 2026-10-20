import { goBack } from '@/lib/back';
import { focusBox, focusGrid, inGrid, isTextField } from '@/lib/keys';
import { setSoundEnabled, soundEnabled } from '@/lib/sound';
import { notify } from '@/lib/toast';
import { index as collections } from '@/routes/collections';
import { edit as profile } from '@/routes/profile';
import { index as stashes } from '@/routes/stashes';
import { index as tags } from '@/routes/tags';
import { router } from '@inertiajs/react';

/**
 * Where an action is on offer. `*` (everything that has no scope) is always on; the others are switched on by the
 * page or the panel that owns them (`useScope`): the feed, one stash, any page but the feed, the shortcut sheet.
 */
export type Scope = 'feed' | 'stash' | 'page' | 'sheet';

export type Category = 'Anywhere' | 'The box' | 'Your stashes' | 'One stash';

export type ActionDef = {
    /** What code calls (`actions.run(id)`) and what a page lends behavior to (`useAction(id, ...)`). */
    id: string;
    label: string;
    category: Category;
    /** Keys that trigger it, in the syntax of @zag-js/hotkeys ("mod+K", "G > H"). Each one is bound. */
    hotkeys: string[];
    scopes?: Scope[];
    /**
     * Whether it also fires while typing in a field. Unsaid, the library decides: keys with Ctrl, Cmd or Alt do,
     * bare keys do not. `false` keeps a modifier key out of fields (Cmd+Z must undo the text there).
     */
    inFields?: boolean;
    /** The key is handled by the part of the page that owns it; the action is only listed (the shortcut sheet). */
    local?: boolean;
    /** What the sheet shows instead of the hotkeys, as separate caps. */
    show?: string[];
    /** Left out of the shortcut sheet (it says the same in another way, or it is plumbing). */
    hidden?: boolean;
    /** A condition of the action itself, checked on every key press, on top of its scope and its handler. */
    when?: () => boolean;
    /** What it does, when no page needs to lend it behavior. */
    run?: (event?: KeyboardEvent) => void;
};

function define<const T extends readonly ActionDef[]>(actions: T): T {
    return actions;
}

const visit = (url: string) => () => router.visit(url);

/** The one box of the feed, or the feed when this page has none. */
function focusSearch() {
    if (!focusBox()) {
        router.visit(stashes().url);
    }
}

function toggleSound() {
    const on = !soundEnabled();

    setSoundEnabled(on);
    notify('message', on ? 'Sounds on' : 'Sounds off', { duration: 1500 });
}

/**
 * Everything a person can do from the keyboard, in one place. The pages lend behavior to the ones that need their
 * state (`useAction`), the rest runs on its own; the shortcut sheet and the menu read their labels and keys from
 * here, so a key is written down once.
 */
export const catalog = define([
    {
        id: 'box.focus',
        label: 'Search or stash',
        category: 'Anywhere',
        hotkeys: ['/', 'mod+K'],
        run: focusSearch,
    },
    {
        id: 'go.feed',
        label: 'Go to your stashes',
        category: 'Anywhere',
        hotkeys: ['G > H'],
        run: visit(stashes().url),
    },
    {
        id: 'go.collections',
        label: 'Go to collections',
        category: 'Anywhere',
        hotkeys: ['G > C'],
        run: visit(collections().url),
    },
    {
        id: 'go.tags',
        label: 'Go to tags',
        category: 'Anywhere',
        hotkeys: ['G > T'],
        run: visit(tags().url),
    },
    {
        id: 'go.settings',
        label: 'Go to settings',
        category: 'Anywhere',
        hotkeys: ['G > S'],
        run: visit(profile().url),
    },
    {
        id: 'sound.toggle',
        label: 'Sounds on or off',
        category: 'Anywhere',
        hotkeys: ['M'],
        run: toggleSound,
    },
    {
        id: 'shortcuts.toggle',
        label: 'Show the shortcuts',
        category: 'Anywhere',
        hotkeys: ['?'],
    },
    {
        id: 'shortcuts.close',
        label: 'Close the shortcuts',
        category: 'Anywhere',
        hotkeys: ['Escape'],
        scopes: ['sheet'],
        hidden: true,
    },
    {
        id: 'back',
        label: 'Back',
        category: 'Anywhere',
        hotkeys: ['Escape'],
        scopes: ['page'],
        // A menu or the shortcut sheet that is open takes the Escape for itself.
        when: () =>
            document.querySelector(
                '[role=menu], [aria-label="Keyboard shortcuts"]',
            ) === null,
        run: goBack,
    },
    {
        id: 'field.blur',
        label: 'Leave the field',
        category: 'Anywhere',
        hotkeys: ['Escape'],
        inFields: true,
        hidden: true,
        // The box has its own Escape (close the list, clear, leave); every other field just lets go.
        when: () =>
            isTextField(document.activeElement) &&
            document.activeElement?.closest('[data-omnibar]') === null,
        run: () => {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        },
    },

    {
        id: 'box.stash-link',
        label: 'Stash a link or a color code',
        category: 'The box',
        hotkeys: ['Enter'],
        local: true,
    },
    {
        id: 'box.stash-note',
        label: 'Stash what is typed as a note',
        category: 'The box',
        hotkeys: ['mod+Enter'],
        local: true,
    },
    {
        id: 'box.help',
        label: 'Show the shortcuts, as the first key of an empty box',
        category: 'The box',
        hotkeys: ['?'],
        local: true,
    },
    {
        id: 'box.filter',
        label: 'Turn the suggestion into a filter',
        category: 'The box',
        hotkeys: ['Tab'],
        local: true,
    },
    {
        id: 'box.unfilter',
        label: 'At the start: take the last filter off',
        category: 'The box',
        hotkeys: ['Backspace'],
        local: true,
    },
    {
        id: 'box.into-stashes',
        label: 'Into your stashes',
        category: 'The box',
        hotkeys: ['ArrowDown'],
        local: true,
    },
    {
        id: 'box.paste-image',
        label: 'Paste an image to stash it',
        category: 'The box',
        hotkeys: ['mod+V'],
        local: true,
    },

    {
        id: 'grid.enter',
        label: 'Into your stashes',
        category: 'Your stashes',
        hotkeys: ['ArrowDown', 'J'],
        scopes: ['feed'],
        hidden: true,
        // Out of a field and out of the grid: the first card. Inside the grid the list moves itself.
        when: () => !inGrid(),
        run: () => {
            focusGrid();
        },
    },
    {
        id: 'grid.down',
        label: 'A row down (j)',
        category: 'Your stashes',
        hotkeys: ['J'],
        scopes: ['feed'],
        hidden: true,
        when: inGrid,
    },
    {
        id: 'grid.up',
        label: 'A row up (k)',
        category: 'Your stashes',
        hotkeys: ['K'],
        scopes: ['feed'],
        hidden: true,
        when: inGrid,
    },
    {
        id: 'grid.leave',
        label: 'Out of the stashes, back to the box',
        category: 'Your stashes',
        hotkeys: ['Escape'],
        scopes: ['feed'],
        hidden: true,
        when: inGrid,
        run: () => {
            focusBox();
        },
    },
    {
        id: 'card.move',
        label: 'Move (j and k work too)',
        category: 'Your stashes',
        hotkeys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
        show: ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'],
        local: true,
    },
    {
        id: 'card.open',
        label: 'Open',
        category: 'Your stashes',
        hotkeys: ['Enter'],
        local: true,
    },
    {
        id: 'card.delete',
        label: 'Delete (x works too)',
        category: 'Your stashes',
        hotkeys: ['Backspace', 'Delete', 'X'],
        show: ['Backspace'],
        scopes: ['feed'],
    },
    {
        id: 'card.open-link',
        label: 'Open the link',
        category: 'Your stashes',
        hotkeys: ['O'],
        scopes: ['feed'],
    },
    {
        id: 'card.copy',
        label: 'Copy the link, color or text',
        category: 'Your stashes',
        hotkeys: ['C'],
        scopes: ['feed'],
    },
    {
        id: 'card.menu',
        label: 'Open the menu (right-click works too)',
        category: 'Your stashes',
        hotkeys: ['shift+F10', 'ContextMenu'],
        show: ['shift+F10'],
        scopes: ['feed'],
    },
    {
        id: 'stash.undo',
        label: 'Undo a delete',
        category: 'Your stashes',
        hotkeys: ['mod+Z'],
        scopes: ['feed'],
        inFields: false,
    },

    {
        id: 'stash.open-original',
        label: 'Open the original',
        category: 'One stash',
        hotkeys: ['O'],
        scopes: ['stash'],
    },
    {
        id: 'stash.add-tag',
        label: 'Add a tag',
        category: 'One stash',
        hotkeys: ['T'],
        scopes: ['stash'],
    },
    {
        id: 'stash.delete',
        label: 'Delete',
        category: 'One stash',
        hotkeys: ['mod+Backspace'],
        scopes: ['stash'],
        inFields: false,
    },
]);

export type ActionId = (typeof catalog)[number]['id'];
