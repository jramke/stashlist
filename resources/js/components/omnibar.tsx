import { FlashNote } from '@/components/flash-note';
import { Kbd } from '@/components/kbd';
import { buttonVariants } from '@/components/ui/button-variants';
import { Spinner } from '@/components/ui/spinner';
import { useModKey } from '@/hooks/use-mod-key';
import { classify } from '@/lib/classify';
import { feedUrl, type SearchMode } from '@/lib/feed-url';
import { focusCard } from '@/lib/grid';
import { play } from '@/lib/sound';
import { cn } from '@/lib/utils';
import { store } from '@/routes/stashes';
import { router, usePage } from '@inertiajs/react';
import { ImagePlus, Link2, Search, X } from 'lucide-react';
import {
    useEffect,
    useId,
    useRef,
    useState,
    type ClipboardEvent,
    type KeyboardEvent,
} from 'react';

type Filters = App.Data.FeedFiltersData;

/** Pauses after the last keystroke before each request of the contract (plan 2.5). */
const KEYWORD_DELAY = 120;
const HYBRID_DELAY = 400;

/** The server embeds nothing shorter than this, so a second request would only repeat the first. */
const HYBRID_MIN_LENGTH = 3;

/** The server refuses a query longer than this; anything longer is a note, not a search. */
const MAX_QUERY = 200;

const IMAGE_TYPES =
    'image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/heif';

/** The twelve color names the pictures are filed under, with the swatch shown for each. */
const colors: Record<App.Enums.ColorName, string> = {
    red: '#e5484d',
    orange: '#f76b15',
    yellow: '#f5d90a',
    green: '#30a46c',
    teal: '#12a594',
    blue: '#0090ff',
    purple: '#8e4ec6',
    pink: '#e93d82',
    brown: '#a18072',
    black: '#1a1a1a',
    white: '#f5f5f5',
    gray: '#8b8d98',
};

const colorNames = Object.keys(colors) as App.Enums.ColorName[];

const types: { value: App.Enums.StashType; label: string }[] = [
    { value: 'link', label: 'Links' },
    { value: 'note', label: 'Notes' },
    { value: 'image', label: 'Images' },
    { value: 'color', label: 'Colors' },
];

function isColorName(word: string): word is App.Enums.ColorName {
    return colorNames.some((name) => name === word);
}

/** A filter that is on, shown as a chip in the box. */
type Chip = {
    key: string;
    label: string;
    swatch?: string;
    /** What the filters become when the chip goes. */
    without: Partial<Filters>;
    /** The word the chip came from, put back in the box when the chip goes (a color word is also a word to search). */
    word?: string;
};

/** One line of the list under the box: a filter to turn on, or an action. */
type Row = {
    key: string;
    kind: string;
    label: string;
    swatch?: string;
    /** What stays in the box when the row is taken. */
    rest: string;
    run: () => void;
};

/** What the text is searched for, or null when it is not a search at all (a link, a color code, a long note). */
function queryOf(text: string): string | null {
    const query = text.trim();

    if (
        query === '' ||
        query.length > MAX_QUERY ||
        query.includes('\n') ||
        ['link', 'color'].includes(classify(query))
    ) {
        return null;
    }

    return query;
}

/**
 * The one box of the feed. Type to search; the words that name a color, a type, a tag or a collection turn
 * into chips. Paste or drop a link, a color, an image or a note to stash it: Enter saves a link or a color
 * code, Ctrl or Cmd with Enter saves whatever is typed.
 */
export function Omnibar({
    filters,
    tags,
    initial,
    note,
    onNoteDone,
    onStashed,
}: {
    filters: Filters;
    tags: App.Data.TagData[];
    initial: string | null;
    note: App.Data.ToastData | null;
    onNoteDone: () => void;
    onStashed: () => void;
}) {
    const { collections } = usePage().props;
    const mod = useModKey();
    const listId = useId();
    const input = useRef<HTMLTextAreaElement>(null);
    const picker = useRef<HTMLInputElement>(null);
    const timers = useRef<number[]>([]);

    const [text, setText] = useState(initial ?? filters.q ?? '');
    // What the page was last asked for. An answer that echoes it is ours; anything else came from outside.
    const requested = useRef(filters.q ?? '');
    // The list under the box has two reasons to be there: suggestions while typing, and the menu of an empty box
    // that a click (not the keyboard) asks for.
    const [open, setOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const [dragging, setDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // The chips change before the server has answered; when its answer arrives (a new `filters`), it wins.
    const [guess, setGuess] = useState<{ base: Filters; next: Filters } | null>(
        null,
    );

    const shown =
        guess !== null && guess.base === filters ? guess.next : filters;
    const kind = classify(text);

    useEffect(() => {
        const current = filters.q ?? '';

        if (current !== requested.current) {
            // The back button changed the query behind our back.
            requested.current = current;
            setText(current);
        }
    }, [filters.q]);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    // A keyboard is at hand on a desktop: the box is ready. On a phone it would only pop the keyboard up.
    useEffect(() => {
        if (initial !== null || matchMedia('(pointer: fine)').matches) {
            input.current?.focus();
        }
    }, [initial]);

    // Anything dropped anywhere on the page is for the box.
    useEffect(() => {
        const carries = (event: DragEvent) =>
            event.dataTransfer?.types.some((type) =>
                ['Files', 'text/uri-list'].includes(type),
            ) ?? false;

        const over = (event: DragEvent) => {
            if (carries(event)) {
                event.preventDefault();
                setDragging(true);
            }
        };
        const leave = (event: DragEvent) => {
            if (event.relatedTarget === null) {
                setDragging(false);
            }
        };
        const drop = (event: DragEvent) => {
            if (!carries(event) || event.dataTransfer === null) {
                return;
            }

            event.preventDefault();
            setDragging(false);

            const files = Array.from(event.dataTransfer.files);
            const link = event.dataTransfer.getData('text/uri-list');

            if (files.length > 0) {
                stashImages(files);
            } else if (link !== '') {
                stash({ input: link.split('\n')[0]?.trim() ?? link });
            }
        };

        window.addEventListener('dragover', over);
        window.addEventListener('dragleave', leave);
        window.addEventListener('drop', drop);

        return () => {
            window.removeEventListener('dragover', over);
            window.removeEventListener('dragleave', leave);
            window.removeEventListener('drop', drop);
        };
    });

    function clearTimers() {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    }

    /** Asks for the feed with some filters changed. The query is whatever the box holds now. */
    function visit(
        change: Partial<Filters>,
        mode?: SearchMode,
        replace = false,
    ) {
        const next = { ...shown, ...change };

        requested.current = next.q ?? '';
        setGuess({ base: filters, next });

        router.get(
            feedUrl(shown, change, mode),
            {},
            {
                only: ['stashes', 'filters'],
                // The list is a merge prop (infinite scroll appends pages); a new query starts it over.
                reset: ['stashes'],
                preserveState: true,
                preserveScroll: true,
                replace,
                onCancel: () => setGuess(null),
                onError: () => setGuess(null),
            },
        );
    }

    /** Searches as you type: the keyword results after a short pause, the smarter ones after a longer one. */
    function search(value: string) {
        clearTimers();

        const query = queryOf(value);

        if ((query ?? '') === requested.current) {
            return;
        }

        const run = (mode: SearchMode) => () =>
            visit({ q: query }, query === null ? undefined : mode, true);

        timers.current = [window.setTimeout(run('keyword'), KEYWORD_DELAY)];

        if (query !== null && query.length >= HYBRID_MIN_LENGTH) {
            timers.current.push(window.setTimeout(run('hybrid'), HYBRID_DELAY));
        }
    }

    function change(value: string) {
        // A note with an Undo button stays: it is the last chance to take a delete back.
        if (note?.undo_url === null) {
            onNoteDone();
        }

        setError(null);
        setHighlight(-1);
        setOpen(true);
        setMenuOpen(false);

        // A color word followed by a space becomes a chip; one more space and nothing was lost.
        const color = /(^|\s)([a-z]+)\s$/i.exec(value);
        const word = color?.[2]?.toLowerCase();

        if (
            color !== null &&
            word !== undefined &&
            isColorName(word) &&
            shown.color === null
        ) {
            const rest = value.slice(0, color.index) + color[1];
            take(rest, { color: word });

            return;
        }

        setText(value);
        search(value);
    }

    /** Turns something typed into a filter: the text that is left keeps searching. */
    function take(rest: string, change: Partial<Filters>) {
        play('pop');
        clearTimers();
        setText(rest);
        setHighlight(-1);
        closeList();
        visit({ ...change, q: queryOf(rest) }, 'hybrid');
    }

    function closeList() {
        setOpen(false);
        setMenuOpen(false);
    }

    function stash(data: { input?: string; image?: File }) {
        // A search that is still waiting for its turn would cancel this visit.
        clearTimers();
        setError(null);

        router.post(
            store.url(),
            {
                ...data,
                // What is in the box when it is stashed: the collection and the tags of the chips come along.
                tags: shown.tags.flatMap(
                    (id) => tags.find((tag) => tag.id === id)?.name ?? [],
                ),
                collection_ids:
                    shown.collection !== null && shown.collection !== 'none'
                        ? [Number(shown.collection)]
                        : [],
            },
            {
                preserveScroll: true,
                preserveState: true,
                reset: ['stashes'],
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    closeList();

                    if (data.input !== undefined) {
                        setText('');

                        // The note was searched for while it was typed; the address still says so.
                        if (requested.current !== '') {
                            visit({ q: null }, undefined, true);
                        }
                    }

                    onStashed();
                },
                onError: (errors) =>
                    setError(
                        errors.input ??
                            errors.image ??
                            'This could not be stashed.',
                    ),
            },
        );
    }

    function stashImages(files: File[]) {
        const [first, ...others] = files.filter((file) =>
            file.type.startsWith('image/'),
        );

        if (first === undefined) {
            setError('This is not an image we can use.');

            return;
        }

        // One visit at a time: a new one would cancel the one still running.
        stash({ image: first });

        if (others.length > 0) {
            setError('One image at a time for now.');
        }
    }

    function stashText() {
        if (text.trim() !== '') {
            stash({ input: text });
        }
    }

    const chips: Chip[] = [
        ...(shown.color === null
            ? []
            : [
                  {
                      key: `color:${shown.color}`,
                      label: shown.color,
                      swatch: colors[shown.color],
                      without: { color: null },
                      word: shown.color,
                  },
              ]),
        ...(shown.type === null
            ? []
            : [
                  {
                      key: `type:${shown.type}`,
                      label:
                          types.find((type) => type.value === shown.type)
                              ?.label ?? shown.type,
                      without: { type: null },
                  },
              ]),
        ...(shown.status === null
            ? []
            : [
                  {
                      key: `status:${shown.status}`,
                      label: 'Failed',
                      without: { status: null },
                  },
              ]),
        ...(shown.collection === null
            ? []
            : [
                  {
                      key: `collection:${shown.collection}`,
                      label:
                          shown.collection === 'none'
                              ? 'Unsorted'
                              : (collections.find(
                                    (collection) =>
                                        String(collection.id) ===
                                        shown.collection,
                                )?.name ?? 'Collection'),
                      without: { collection: null },
                  },
              ]),
        ...shown.tags.map((id) => ({
            key: `tag:${id}`,
            label: tags.find((tag) => tag.id === id)?.name ?? 'Tag',
            without: { tags: shown.tags.filter((other) => other !== id) },
        })),
    ];

    function removeChip(chip: Chip) {
        const rest = chip.word === undefined ? text : joinWord(chip.word, text);

        clearTimers();
        setText(rest);
        visit({ ...chip.without, q: queryOf(rest) }, 'hybrid');
        input.current?.focus();
    }

    const suggestions = suggest();
    const menu = text === '' && menuOpen ? emptyRows() : [];
    const rows = open && suggestions.length > 0 ? suggestions : menu;
    const visible = rows.length > 0;

    /** What the last word typed (or the whole text) could become. */
    function suggest(): Row[] {
        const found: Row[] = [];
        const last = /(\S+)$/.exec(text)?.[1];

        if (last === undefined || last.length < 2 || kind !== 'text') {
            return found;
        }

        const before = text.slice(0, text.length - last.length);
        const fragments = [{ needle: last.toLowerCase(), rest: before }];

        if (/\s/.test(text.trim())) {
            fragments.push({ needle: text.trim().toLowerCase(), rest: '' });
        }

        const matches = (name: string, needle: string) =>
            name.toLowerCase().startsWith(needle);

        for (const { needle, rest } of fragments) {
            if (shown.color === null) {
                for (const name of colorNames) {
                    if (matches(name, needle)) {
                        found.push({
                            key: `color:${name}`,
                            kind: 'Color',
                            label: name,
                            swatch: colors[name],
                            rest,
                            run: () => take(rest, { color: name }),
                        });
                    }
                }
            }

            if (shown.type === null) {
                for (const type of types) {
                    if (matches(type.label, needle)) {
                        found.push({
                            key: `type:${type.value}`,
                            kind: 'Type',
                            label: type.label,
                            rest,
                            run: () => take(rest, { type: type.value }),
                        });
                    }
                }
            }

            if (shown.status === null && matches('failed', needle)) {
                found.push({
                    key: 'status:failed',
                    kind: 'Status',
                    label: 'Failed',
                    rest,
                    run: () => take(rest, { status: 'failed' }),
                });
            }

            if (shown.collection === null) {
                if (matches('unsorted', needle)) {
                    found.push({
                        key: 'collection:none',
                        kind: 'Collection',
                        label: 'Unsorted',
                        rest,
                        run: () => take(rest, { collection: 'none' }),
                    });
                }

                for (const collection of collections) {
                    if (matches(collection.name, needle)) {
                        found.push({
                            key: `collection:${collection.id}`,
                            kind: 'Collection',
                            label: collection.name,
                            rest,
                            run: () =>
                                take(rest, {
                                    collection: String(collection.id),
                                }),
                        });
                    }
                }
            }

            for (const tag of tags) {
                if (!shown.tags.includes(tag.id) && matches(tag.name, needle)) {
                    found.push({
                        key: `tag:${tag.id}`,
                        kind: 'Tag',
                        label: tag.name,
                        rest,
                        run: () =>
                            take(rest, { tags: [...shown.tags, tag.id] }),
                    });
                }
            }
        }

        const seen = new Set<string>();

        return found
            .filter((row) => !seen.has(row.key) && seen.add(row.key))
            .slice(0, 6);
    }

    /** What a click in the empty box offers: an image from disk, and the collections. */
    function emptyRows(): Row[] {
        const list: Row[] = [
            {
                key: 'upload',
                kind: 'Image',
                label: 'Stash an image from your device',
                rest: '',
                run: () => picker.current?.click(),
            },
        ];

        if (shown.collection === null) {
            for (const collection of [
                { id: 'none', name: 'Unsorted' },
                ...collections.map(({ id, name }) => ({
                    id: String(id),
                    name,
                })),
            ]) {
                list.push({
                    key: `collection:${collection.id}`,
                    kind: 'Collection',
                    label: collection.name,
                    rest: '',
                    run: () => take('', { collection: collection.id }),
                });
            }
        }

        return list;
    }

    function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        const modifier = event.metaKey || event.ctrlKey;
        const field = event.currentTarget;
        const picked = visible ? rows[highlight] : undefined;

        if (event.key === 'Enter') {
            if (event.shiftKey || event.nativeEvent.isComposing) {
                return;
            }

            event.preventDefault();

            if (modifier) {
                stashText();
            } else if (picked !== undefined) {
                picked.run();
            } else if (kind === 'link' || kind === 'color') {
                stashText();
            }
        } else if (event.key === 'ArrowDown') {
            if (visible) {
                event.preventDefault();
                setHighlight((value) => Math.min(value + 1, rows.length - 1));
            } else if (!text.includes('\n')) {
                event.preventDefault();
                focusCard('first');
            }
        } else if (event.key === 'ArrowUp' && visible && highlight >= 0) {
            event.preventDefault();
            setHighlight((value) => value - 1);
        } else if (
            event.key === 'Tab' &&
            !event.shiftKey &&
            visible &&
            rows === suggestions
        ) {
            event.preventDefault();
            (picked ?? suggestions[0])?.run();
        } else if (event.key === 'Escape') {
            event.preventDefault();

            if (visible) {
                closeList();
            } else if (text !== '') {
                clearTimers();
                setText('');
                visit({ q: null }, undefined, true);
            } else {
                field.blur();
            }
        } else if (
            event.key === 'Backspace' &&
            field.selectionStart === 0 &&
            field.selectionEnd === 0
        ) {
            const last = chips.at(-1);

            if (last !== undefined) {
                event.preventDefault();
                removeChip(last);
            }
        }
    }

    function paste(event: ClipboardEvent<HTMLTextAreaElement>) {
        const files = Array.from(event.clipboardData.files);

        if (files.some((file) => file.type.startsWith('image/'))) {
            event.preventDefault();
            stashImages(files);
        }
    }

    const swatch = kind === 'color' ? text.trim() : undefined;
    const LeadingIcon = kind === 'link' ? Link2 : Search;

    return (
        <div
            data-omnibar
            className="sticky top-3 z-30 mb-6"
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    closeList();
                }
            }}
            onPointerDown={() => {
                setOpen(true);
                setMenuOpen(true);
            }}
        >
            <div
                className={cn(
                    'relative rounded-2xl border bg-card shadow-sm transition-[border-color,box-shadow] duration-150 focus-within:border-foreground/25 focus-within:shadow-md',
                    dragging && 'border-foreground/40 shadow-md',
                )}
            >
                <div className="flex items-start gap-3 px-4 py-3.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-muted-foreground">
                        {swatch === undefined ? (
                            <LeadingIcon className="size-4" />
                        ) : (
                            <span
                                className="size-4 rounded-full border border-foreground/15"
                                style={{ background: swatch }}
                            />
                        )}
                    </span>

                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
                        {chips.map((chip) => (
                            <span
                                key={chip.key}
                                className="inline-flex h-6 animate-chip-in items-center gap-1.5 rounded-full border border-foreground/10 bg-muted pr-1 pl-2.5 text-xs font-medium"
                            >
                                {chip.swatch !== undefined && (
                                    <span
                                        className="-ml-1 size-3 rounded-full border border-foreground/15"
                                        style={{ background: chip.swatch }}
                                    />
                                )}
                                {chip.label}
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    aria-label={`Remove ${chip.label}`}
                                    onClick={() => removeChip(chip)}
                                    className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/10 hover:text-foreground"
                                >
                                    <X className="size-3" />
                                </button>
                            </span>
                        ))}

                        <textarea
                            ref={input}
                            data-omnibar-input
                            role="combobox"
                            aria-label="Search your stashes, or stash a link, a note, a color or an image"
                            aria-expanded={visible}
                            aria-controls={listId}
                            aria-activedescendant={
                                visible && highlight >= 0
                                    ? `${listId}-${highlight}`
                                    : undefined
                            }
                            aria-autocomplete="list"
                            rows={1}
                            value={text}
                            placeholder={
                                chips.length > 0
                                    ? 'Search these'
                                    : 'Search, or paste anything to stash'
                            }
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            onChange={(event) => change(event.target.value)}
                            onKeyDown={keyDown}
                            onPaste={paste}
                            className="field-sizing-content max-h-48 min-h-6 min-w-40 flex-1 resize-none bg-transparent py-0 text-base leading-6 outline-none placeholder:text-muted-foreground md:text-sm"
                        />
                    </div>

                    <div className="flex h-6 shrink-0 items-center gap-2 text-sm">
                        {processing ? (
                            <span className="inline-flex animate-note-in items-center gap-1.5 text-muted-foreground">
                                <Spinner className="size-3.5" />
                                Stashing
                            </span>
                        ) : error !== null ? (
                            <span
                                role="alert"
                                className="animate-note-in text-destructive"
                            >
                                {error}
                            </span>
                        ) : note !== null ? (
                            <FlashNote note={note} onDone={onNoteDone} />
                        ) : kind !== 'empty' ? (
                            <button
                                type="button"
                                onClick={stashText}
                                className={buttonVariants({
                                    size: 'xs',
                                    variant:
                                        kind === 'text' ? 'ghost' : 'default',
                                    className: 'gap-1.5',
                                })}
                            >
                                {kind === 'link'
                                    ? 'Stash link'
                                    : kind === 'color'
                                      ? 'Stash color'
                                      : 'Stash note'}
                                <Kbd
                                    className={cn(
                                        'hidden sm:inline-flex',
                                        kind !== 'text' &&
                                            'border-background/25 bg-background/15 text-background',
                                    )}
                                >
                                    {kind === 'text' ? `${mod}↵` : '↵'}
                                </Kbd>
                            </button>
                        ) : null}
                    </div>
                </div>

                {dragging && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-card/90 text-sm text-muted-foreground backdrop-blur-[2px]">
                        <ImagePlus className="mr-2 size-4" />
                        Drop to stash
                    </div>
                )}

                {visible && (
                    <div className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-xl border bg-popover shadow-lg">
                        <ul
                            id={listId}
                            role="listbox"
                            className="max-h-72 overflow-y-auto p-1.5"
                        >
                            {rows.map((row, index) => (
                                <li
                                    key={row.key}
                                    id={`${listId}-${index}`}
                                    role="option"
                                    aria-selected={index === highlight}
                                    onMouseEnter={() => setHighlight(index)}
                                    // Keep the focus in the box: a click on a row must not blur it first.
                                    onMouseDown={(event) =>
                                        event.preventDefault()
                                    }
                                    onClick={() => {
                                        row.run();
                                        input.current?.focus();
                                    }}
                                    className={cn(
                                        'flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm',
                                        index === highlight && 'bg-muted',
                                    )}
                                >
                                    {row.swatch !== undefined && (
                                        <span
                                            className="size-3.5 rounded-full border border-foreground/15"
                                            style={{ background: row.swatch }}
                                        />
                                    )}
                                    <span className="truncate">
                                        {row.label}
                                    </span>
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        {row.kind}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        {rows === suggestions && (
                            <p className="flex items-center gap-1.5 border-t px-3 py-2 text-xs text-muted-foreground">
                                <Kbd>Tab</Kbd> make it a filter
                                <Kbd className="ml-2">↑</Kbd>
                                <Kbd>↓</Kbd> choose
                            </p>
                        )}
                    </div>
                )}
            </div>

            <input
                ref={picker}
                type="file"
                accept={IMAGE_TYPES}
                className="hidden"
                tabIndex={-1}
                onChange={(event) => {
                    stashImages(Array.from(event.currentTarget.files ?? []));
                    event.currentTarget.value = '';
                }}
            />
        </div>
    );
}

/** Puts a word that was a chip back in front of the text. */
function joinWord(word: string, text: string): string {
    return text === '' ? word : `${word} ${text}`;
}
