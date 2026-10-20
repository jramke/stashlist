import { actions } from '@/commands/actions';
import { AppHeader } from '@/components/app-header';
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
import { ImagePlus, Link2, X } from 'lucide-react';
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
 * The one box of the feed, and with it the bar at the top of the page: the mark of the app is the front of the
 * box, the menu of the account its end, and the line under all of it. Type to search; the words that name a
 * color, a type, a tag or a collection turn into chips. Paste or drop a link, a color, an image or a note to
 * stash it: Enter saves a link or a color code, Ctrl or Cmd with Enter saves whatever is typed. What it is doing
 * and what comes next is the machine in `machines/omnibar`; this draws it.
 */
export function Omnibar({
    filters,
    tags,
    initial,
    note,
    autoFocus,
    onNoteDone,
    onStashed,
}: {
    filters: App.Data.FeedFiltersData;
    tags: App.Data.TagData[];
    initial: string | null;
    note: App.Data.ToastData | null;
    autoFocus?: boolean;
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
        autoFocus,
        onVisit: visitFeed,
        onStash: stashIt,
        onNoteDone,
        onStashed,
        onLeave: focusGrid,
        onHelp: () => actions.run('shortcuts.toggle'),
        onTake: () => play('pop'),
    });
    const api = connect(service, normalizeProps);

    return (
        <AppHeader
            className="sticky top-0 z-30 mb-6 has-[[data-dragging]]:border-foreground/40 has-[[data-omnibar-input]:focus]:border-foreground/40"
            badge={
                api.leading.kind === 'search' ? null : (
                    <span
                        {...api.getLeadingProps()}
                        aria-hidden
                        className="absolute -right-1.5 -bottom-1 grid size-3.5 animate-chip-in place-items-center rounded-full bg-background text-muted-foreground ring-1 ring-foreground/15"
                    >
                        {api.leading.kind === 'swatch' ? (
                            <span
                                className="size-2.5 rounded-full"
                                style={{ background: api.leading.color }}
                            />
                        ) : (
                            <Link2 className="size-2.5" />
                        )}
                    </span>
                )
            }
        >
            <div {...api.getRootProps()} className="relative min-w-0 flex-1">
                <div
                    {...api.getFieldProps()}
                    className="flex items-start gap-3"
                >
                    <div className="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 py-2.5">
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
                        className="flex h-11 shrink-0 items-center gap-2 text-sm"
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
                        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/90 text-sm text-muted-foreground backdrop-blur-[2px]"
                    >
                        <ImagePlus className="mr-2 size-4" />
                        Drop to stash
                    </div>
                )}

                {api.visible && (
                    <div
                        {...api.getPopupProps()}
                        className="pop absolute inset-x-0 top-full mt-2 overflow-hidden"
                    >
                        <ul
                            {...api.getListProps()}
                            className="max-h-72 overflow-y-auto"
                        >
                            {api.rows.map((row, index) => (
                                <li
                                    key={row.key}
                                    {...api.getRowProps(row, index)}
                                    className="pop-item"
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
                                className="mt-1 flex items-center gap-1.5 border-t border-foreground/[0.07] px-2.5 pt-2 pb-1 text-xs text-muted-foreground"
                            >
                                <Kbd>Tab</Kbd> to filter
                                <Kbd className="ml-2">↑</Kbd>
                                <Kbd>↓</Kbd> to choose
                            </p>
                        )}
                    </div>
                )}

                <input {...api.getPickerProps()} className="hidden" />
            </div>
        </AppHeader>
    );
}
