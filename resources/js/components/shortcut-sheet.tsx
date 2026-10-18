import { Kbd } from '@/components/kbd';
import { useModKey } from '@/hooks/use-mod-key';

type Shortcut = { keys: string[]; label: string };

/** Every shortcut of the app on one inline panel. It opens with `?` and is not a dialog: the page stays usable. */
export function ShortcutSheet({ onClose }: { onClose: () => void }) {
    const mod = useModKey();

    const groups: { title: string; items: Shortcut[] }[] = [
        {
            title: 'Anywhere',
            items: [
                { keys: ['/'], label: 'Search or stash' },
                {
                    keys: [mod, 'K'],
                    label: 'Search or stash, even while typing',
                },
                { keys: ['g', 'h'], label: 'Go to your stashes' },
                { keys: ['g', 'c'], label: 'Go to collections' },
                { keys: ['g', 't'], label: 'Go to tags' },
                { keys: ['g', 's'], label: 'Go to settings' },
                { keys: ['Esc'], label: 'Back' },
                { keys: ['m'], label: 'Sounds on or off' },
            ],
        },
        {
            title: 'The box',
            items: [
                { keys: ['↵'], label: 'Stash a link or a color code' },
                { keys: [mod, '↵'], label: 'Stash what is typed as a note' },
                { keys: ['Tab'], label: 'Turn the suggestion into a filter' },
                {
                    keys: ['⌫'],
                    label: 'At the start: take the last filter off',
                },
                { keys: ['↓'], label: 'Into your stashes' },
                { keys: [mod, 'V'], label: 'Paste an image to stash it' },
            ],
        },
        {
            title: 'Your stashes',
            items: [
                {
                    keys: ['←', '↑', '↓', '→'],
                    label: 'Move (j and k work too)',
                },
                { keys: ['↵'], label: 'Open' },
                { keys: ['⌫'], label: 'Delete (x works too)' },
                { keys: [mod, 'Z'], label: 'Undo a delete' },
            ],
        },
        {
            title: 'One stash',
            items: [
                { keys: ['o'], label: 'Open the original' },
                { keys: ['t'], label: 'Add a tag' },
                { keys: [mod, '⌫'], label: 'Delete' },
            ],
        },
    ];

    return (
        <section
            aria-label="Keyboard shortcuts"
            className="fixed inset-x-4 bottom-4 z-50 mx-auto max-h-[70svh] max-w-2xl animate-panel-in overflow-y-auto rounded-2xl border bg-popover p-5 shadow-xl"
        >
            <div className="mb-4 flex items-center">
                <h2 className="text-sm font-medium">Keyboard shortcuts</h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="ml-auto rounded px-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                    Close <Kbd>Esc</Kbd>
                </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                {groups.map((group) => (
                    <div key={group.title} className="grid content-start gap-2">
                        <h3 className="text-xs text-muted-foreground">
                            {group.title}
                        </h3>
                        <ul className="grid gap-1.5 text-sm">
                            {group.items.map((item) => (
                                <li
                                    key={item.label}
                                    className="flex items-center gap-3"
                                >
                                    <span className="min-w-0 flex-1 truncate">
                                        {item.label}
                                    </span>
                                    <span className="flex shrink-0 gap-1">
                                        {item.keys.map((key) => (
                                            <Kbd key={key}>{key}</Kbd>
                                        ))}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </section>
    );
}
