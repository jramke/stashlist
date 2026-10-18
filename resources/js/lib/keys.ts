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
