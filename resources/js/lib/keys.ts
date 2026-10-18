/** Focuses the one box that searches and stashes, if this page has it. */
export function focusBox(): boolean {
    const box = document.querySelector<HTMLElement>('[data-omnibar-input]');

    box?.focus();

    return box !== null;
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
