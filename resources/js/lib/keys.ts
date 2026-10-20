/** Focuses the one box that searches and stashes, if this page has it. */
export function focusBox(): boolean {
    const box = document.querySelector<HTMLElement>('[data-omnibar-input]');

    box?.focus();

    return box !== null;
}

/** The list of cards, as the feed marks it. */
const GRID = '[data-stash-grid]';

/**
 * Puts the focus on the list of cards, which highlights the first one if none is. The page does not scroll to
 * the list for it (the list is the whole grid); the highlighted card scrolls itself into view.
 */
export function focusGrid(): boolean {
    const grid = document.querySelector<HTMLElement>(GRID);

    grid?.focus({ preventScroll: true });

    return grid !== null;
}

/** Whether the focus is in the list of cards, where the list handles the arrow keys itself. */
export function inGrid(): boolean {
    return (
        document.querySelector(GRID)?.contains(document.activeElement) ?? false
    );
}

const NOT_TEXT = [
    'button',
    'checkbox',
    'color',
    'file',
    'image',
    'radio',
    'range',
    'reset',
    'submit',
];

/** True for a field where letters are typed (not a checkbox or a button), which is where keys click. */
export function isTextField(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement &&
            !NOT_TEXT.includes(target.type)) ||
        (target instanceof HTMLElement && target.isContentEditable)
    );
}

/** Places that keep their letters for themselves: the list of cards, a menu, a dialog, the list of the box. */
const OWN_KEYS =
    '[data-stash-grid], [role=menu], [role=dialog], [role=listbox]';

/**
 * Whether the letters typed now are for the box: the feed has one, and the focus is on nothing that wants them (the
 * page itself, or a button or a link that is not part of a list or a menu). The letter shortcuts stand aside
 * then, and `typeIntoBox` moves the focus.
 */
export function typesIntoBox(): boolean {
    if (document.querySelector('[data-omnibar-input]') === null) {
        return false;
    }

    const active = document.activeElement;

    if (
        active === null ||
        active === document.body ||
        active === document.documentElement
    ) {
        return true;
    }

    return (
        (active instanceof HTMLButtonElement ||
            active instanceof HTMLAnchorElement) &&
        active.closest(OWN_KEYS) === null
    );
}

/**
 * A letter typed with nothing to take it goes to the box: it gets the focus, and the key that was pressed lands in
 * it, because the browser puts the character where the focus is when the key goes up. Keys with Ctrl, Cmd or Alt
 * are shortcuts, not text (AltGr is how some keyboards type a character), and a key that something else already
 * answered (a hotkey) is left alone.
 */
export function typeIntoBox(event: KeyboardEvent): void {
    const command =
        (event.ctrlKey || event.metaKey || event.altKey) &&
        !event.getModifierState('AltGraph');

    if (
        event.defaultPrevented ||
        event.isComposing ||
        command ||
        event.key.length !== 1 ||
        event.key === ' ' ||
        !typesIntoBox()
    ) {
        return;
    }

    focusBox();
}
