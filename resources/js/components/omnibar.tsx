import { FlashNote } from '@/components/flash-note';
import { Kbd } from '@/components/kbd';
import { buttonVariants } from '@/components/ui/button-variants';
import { Spinner } from '@/components/ui/spinner';
import { useModKey } from '@/hooks/use-mod-key';
import { focusGrid } from '@/lib/keys';
import { play } from '@/lib/sound';
import { cn } from '@/lib/utils';
import {
    connect,
    machine,
    type StashRequest,
    type VisitRequest,
} from '@/machines/omnibar';
import { store } from '@/routes/stashes';
import { router, usePage } from '@inertiajs/react';
import { normalizeProps, useMachine } from '@zag-js/react';
import { ImagePlus, Link2, Search, X } from 'lucide-react';
import { useId } from 'react';

/** Asks for the feed. The list is a merge prop (infinite scroll appends pages); a new query starts it over. */
function visitFeed({ url, replace, settled }: VisitRequest) {
    router.get(
        url,
        {},
        {
            only: ['stashes', 'filters'],
            reset: ['stashes'],
            preserveState: true,
            preserveScroll: true,
            replace,
            onFinish: settled,
        },
    );
}

function stashIt({ payload, succeeded, failed, settled }: StashRequest) {
    router.post(store.url(), payload, {
        preserveScroll: true,
        preserveState: true,
        reset: ['stashes'],
        onSuccess: succeeded,
        onError: (errors) =>
            failed(
                errors.input ?? errors.image ?? 'This could not be stashed.',
            ),
        onFinish: settled,
    });
}

/**
 * The one box of the feed. Type to search; the words that name a color, a type, a tag or a collection turn
 * into chips. Paste or drop a link, a color, an image or a note to stash it: Enter saves a link or a color
 * code, Ctrl or Cmd with Enter saves whatever is typed. What it is doing and what comes next is the machine in
 * `machines/omnibar`; this draws it.
 */
export function Omnibar({
    filters,
    tags,
    initial,
    note,
    onNoteDone,
    onStashed,
}: {
    filters: App.Data.FeedFiltersData;
    tags: App.Data.TagData[];
    initial: string | null;
    note: App.Data.ToastData | null;
    onNoteDone: () => void;
    onStashed: () => void;
}) {
    const { collections } = usePage().props;
    const mod = useModKey();
    const service = useMachine(machine, {
        id: useId(),
        filters,
        tags,
        collections,
        initial,
        note,
        onVisit: visitFeed,
        onStash: stashIt,
        onNoteDone,
        onStashed,
        onLeave: focusGrid,
        onTake: () => play('pop'),
    });
    const api = connect(service, normalizeProps);

    return (
        <div {...api.getRootProps()} className="sticky top-3 z-30 mb-6">
            <div
                {...api.getFieldProps()}
                className={cn(
                    'relative rounded-2xl border bg-card shadow-sm transition-[border-color,box-shadow] duration-150 focus-within:border-foreground/25 focus-within:shadow-md',
                    api.dragging && 'border-foreground/40 shadow-md',
                )}
            >
                <div className="flex items-start gap-3 px-4 py-3.5">
                    <span
                        {...api.getLeadingProps()}
                        className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-muted-foreground"
                    >
                        {api.leading.kind === 'swatch' ? (
                            <span
                                className="size-4 rounded-full border border-foreground/15"
                                style={{ background: api.leading.color }}
                            />
                        ) : api.leading.kind === 'link' ? (
                            <Link2 className="size-4" />
                        ) : (
                            <Search className="size-4" />
                        )}
                    </span>

                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
                        {api.chips.map((chip) => (
                            <span
                                key={chip.key}
                                {...api.getChipProps(chip)}
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
                                    {...api.getChipRemoveProps(chip)}
                                    className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/10 hover:text-foreground"
                                >
                                    <X className="size-3" />
                                </button>
                            </span>
                        ))}

                        <textarea
                            {...api.getInputProps()}
                            className="field-sizing-content max-h-48 min-h-6 min-w-40 flex-1 resize-none bg-transparent py-0 text-base leading-6 outline-none placeholder:text-muted-foreground md:text-sm"
                        />
                    </div>

                    <div
                        {...api.getSlotProps()}
                        className="flex h-6 shrink-0 items-center gap-2 text-sm"
                    >
                        {api.slot === 'stashing' ? (
                            <span className="inline-flex animate-note-in items-center gap-1.5 text-muted-foreground">
                                <Spinner className="size-3.5" />
                                Stashing
                            </span>
                        ) : api.slot === 'error' ? (
                            <span
                                role="alert"
                                className="animate-note-in text-destructive"
                            >
                                {api.error}
                            </span>
                        ) : api.slot === 'note' ? (
                            <FlashNote note={note} onDone={onNoteDone} />
                        ) : api.slot === 'action' ? (
                            <button
                                {...api.getActionProps()}
                                className={buttonVariants({
                                    size: 'xs',
                                    variant:
                                        api.kind === 'text'
                                            ? 'ghost'
                                            : 'default',
                                    className: 'gap-1.5',
                                })}
                            >
                                {api.stashLabel}
                                <Kbd
                                    className={cn(
                                        'hidden sm:inline-flex',
                                        api.kind !== 'text' &&
                                            'border-background/25 bg-background/15 text-background',
                                    )}
                                >
                                    {api.kind === 'text' ? `${mod}↵` : '↵'}
                                </Kbd>
                            </button>
                        ) : null}
                    </div>
                </div>

                {api.dragging && (
                    <div
                        {...api.getDropProps()}
                        className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-card/90 text-sm text-muted-foreground backdrop-blur-[2px]"
                    >
                        <ImagePlus className="mr-2 size-4" />
                        Drop to stash
                    </div>
                )}

                {api.visible && (
                    <div
                        {...api.getPopupProps()}
                        className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-xl border bg-popover shadow-lg"
                    >
                        <ul
                            {...api.getListProps()}
                            className="max-h-72 overflow-y-auto p-1.5"
                        >
                            {api.rows.map((row, index) => (
                                <li
                                    key={row.key}
                                    {...api.getRowProps(row, index)}
                                    className={cn(
                                        'flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm',
                                        index === api.highlight && 'bg-muted',
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

                        {api.suggesting && (
                            <p
                                {...api.getHintProps()}
                                className="flex items-center gap-1.5 border-t px-3 py-2 text-xs text-muted-foreground"
                            >
                                <Kbd>Tab</Kbd> make it a filter
                                <Kbd className="ml-2">↑</Kbd>
                                <Kbd>↓</Kbd> choose
                            </p>
                        )}
                    </div>
                )}
            </div>

            <input {...api.getPickerProps()} className="hidden" />
        </div>
    );
}
