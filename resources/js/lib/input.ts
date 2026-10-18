const MODIFIERS = ['Shift', 'Control', 'Alt', 'Meta'];

/**
 * Writes which kind of input the person used last on the document (`<html data-input="keyboard">` or
 * `"pointer"`) for CSS to read. A card that grows under the mouse can fade, but the card a key lands on must
 * not: a key held down moves faster than a fade, and nothing that is done all day animates.
 */
export function trackInput(): () => void {
    const root = document.documentElement;
    const use = (kind: 'keyboard' | 'pointer') => {
        // Writing the same value again would still make the browser look at every style.
        if (root.dataset.input !== kind) {
            root.dataset.input = kind;
        }
    };

    const key = (event: KeyboardEvent) => {
        if (!MODIFIERS.includes(event.key)) {
            use('keyboard');
        }
    };
    const press = () => use('pointer');
    const move = (event: PointerEvent) => {
        // A pointer that has not moved is the page scrolling under it: that is not the person using it.
        if (event.movementX !== 0 || event.movementY !== 0) {
            use('pointer');
        }
    };

    window.addEventListener('keydown', key, true);
    window.addEventListener('pointerdown', press, true);
    window.addEventListener('pointermove', move, true);

    return () => {
        window.removeEventListener('keydown', key, true);
        window.removeEventListener('pointerdown', press, true);
        window.removeEventListener('pointermove', move, true);
        delete root.dataset.input;
    };
}
