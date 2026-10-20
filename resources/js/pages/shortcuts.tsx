import { ShortcutList } from '@/components/shortcut-list';
import { Head } from '@inertiajs/react';

/** The notes that come before the list: how keys are written, and when the letters are shortcuts. */
const notes = [
    'Keys with ⌘ (Ctrl on Windows and Linux) work everywhere, also while you type. Plain keys never fire inside a field.',
    'A step like G then H is two presses, one after the other: press G, let go, press H.',
    'On your stashes, start typing and the letters go to the box. That is why the letter shortcuts (G, M, J) wait until something is selected: press ↓ to step onto your stashes, and the letters become shortcuts again. Esc steps back to the box.',
    'Every action of a stash is also in its menu: right-click a card, or press Shift+F10 on the selected one.',
];

/** A few words on the actions that need them, for the list under the name of each. */
const descriptions: Record<string, string> = {
    'box.focus':
        'Jumps to the box from any page. On your stashes you can also just start typing: with nothing selected, the letters go to the box.',
    'go.feed':
        'Two keys, one after the other: press G, let go, then press the second key.',
    'sound.toggle': 'The clicks and chimes of the app.',
    'shortcuts.toggle':
        'The short list, over the page. This page has the whole list with a few words on each key.',
    'box.help':
        'A ? typed into an empty box shows the shortcuts instead of being a character. After any other character it is a ?.',
    'box.stash-link':
        'A link or a color code is stashed with Enter alone. Anything else needs ⌘ or Ctrl with Enter, so a search typed by habit never becomes a note.',
    'box.filter':
        'The words that name a color, a type, a tag or a collection can become a filter, shown as a chip in the box.',
    'card.delete':
        'The card goes at once and the note in the box offers the undo. It takes ⌘ or Ctrl so that a stray key never deletes.',
    'card.open-link':
        'Opens the address of the stash in a new tab. Enter on its own opens the stash.',
    'card.copy':
        'A link copies its address, a color its code and a note its text.',
    'card.menu':
        'The same actions as these keys, in a menu at the card. The Menu key of a keyboard does it too.',
};

/** Every keyboard shortcut of the app with a few words on each, read from the catalog (`commands/catalog.ts`). */
export default function Shortcuts() {
    return (
        <>
            <Head title="Shortcuts" />

            <div className="mx-auto grid max-w-2xl gap-8">
                <div className="grid gap-2">
                    <h1 className="text-2xl font-medium">Shortcuts</h1>
                    <p className="text-sm text-muted-foreground">
                        What you can do without the mouse. Press ? anywhere for
                        the short list.
                    </p>
                </div>

                <ul className="grid gap-2 text-sm text-muted-foreground">
                    {notes.map((note) => (
                        <li key={note}>{note}</li>
                    ))}
                </ul>

                <ShortcutList
                    descriptions={descriptions}
                    className="sm:grid-cols-1"
                />
            </div>
        </>
    );
}
