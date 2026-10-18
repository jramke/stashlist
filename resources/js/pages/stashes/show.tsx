import StashController from '@/actions/App/Http/Controllers/StashController';
import StashReprocessController from '@/actions/App/Http/Controllers/StashReprocessController';
import { useAction, useScope } from '@/commands/hooks';
import { CollectionPicker } from '@/components/collection-picker';
import { FlashNote } from '@/components/flash-note';
import { HighlightList } from '@/components/highlight-list';
import { InlineField } from '@/components/inline-field';
import { Kbd } from '@/components/kbd';
import { Keys } from '@/components/keys';
import { StashCard } from '@/components/stash-card';
import { TagEditor } from '@/components/tag-editor';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuthUser } from '@/hooks/use-auth-user';
import { useFlashNote } from '@/hooks/use-flash-note';
import { aiErrorMessage } from '@/lib/ai-status';
import { goBack } from '@/lib/back';
import { index } from '@/routes/stashes';
import { Deferred, Head, router, usePoll } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, RotateCw, Trash2 } from 'lucide-react';
import { useEffect } from 'react';

type Props = {
    detail: App.Data.StashDetailData;
    /** Deferred: found after the page is shown. */
    similar?: App.Data.StashData[];
};

const bodyFields = {
    link: { label: 'Comment', placeholder: 'Add a comment' },
    note: { label: 'Text', placeholder: 'Write something' },
    image: { label: 'Comment', placeholder: 'Add a comment' },
    file: { label: 'Comment', placeholder: 'Add a comment' },
    color: { label: 'Color', placeholder: 'A color, like #e63946' },
} satisfies Record<App.Enums.StashType, { label: string; placeholder: string }>;

/** How often the page asks again while the stash is still being read or tagged. */
const POLL_INTERVAL = 3000;

export default function Show({ detail, similar }: Props) {
    const { stash } = detail;
    const { note, clear } = useFlashNote();
    const waiting = stash.fetching || stash.tagging;
    const { start, stop } = usePoll(
        POLL_INTERVAL,
        { only: ['detail'] },
        { autoStart: false },
    );
    useEffect(() => {
        if (waiting) {
            start();
        } else {
            stop();
        }
    }, [waiting, start, stop]);

    // The keys of one stash (they are in the catalog): o opens the original, t goes to the tags, Cmd+Backspace deletes.
    useScope('stash');
    useAction('stash.open-original', {
        run: () => {
            if (stash.url !== null) {
                window.open(stash.url, '_blank', 'noopener,noreferrer');
            }
        },
        enabled: () => stash.url !== null,
    });
    useAction('stash.add-tag', () =>
        document.querySelector<HTMLElement>('[data-tag-input]')?.focus(),
    );
    useAction('stash.delete', () =>
        router.delete(StashController.destroy.url(stash.id)),
    );

    return (
        <>
            <Head
                title={
                    stash.title ?? (stash.type === 'note' ? 'Note' : 'Color')
                }
            />

            <div className="mx-auto grid max-w-2xl gap-8">
                <div className="flex h-6 items-center">
                    <a
                        href={index().url}
                        onClick={(event) => {
                            if (
                                event.button === 0 &&
                                !(
                                    event.metaKey ||
                                    event.ctrlKey ||
                                    event.shiftKey
                                )
                            ) {
                                event.preventDefault();
                                goBack();
                            }
                        }}
                        className="flex items-center gap-1.5 rounded text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        <ArrowLeft className="size-4" />
                        Stashes
                        <Kbd>Esc</Kbd>
                    </a>
                    <FlashNote note={note} onDone={clear} className="ml-auto" />
                </div>

                <Preview detail={detail} />

                <header className="grid gap-2">
                    <InlineField
                        url={StashController.update.url(stash.id)}
                        name="title"
                        initial={stash.title ?? ''}
                        label="Title"
                        placeholder={
                            stash.type === 'link' || stash.type === 'image'
                                ? 'Untitled'
                                : 'Add a title'
                        }
                        className="text-2xl font-medium"
                    />
                    {stash.url !== null && (
                        <a
                            href={stash.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-fit max-w-full items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                        >
                            {detail.favicon_url !== null && (
                                <img
                                    src={detail.favicon_url}
                                    alt=""
                                    width={16}
                                    height={16}
                                    referrerPolicy="no-referrer"
                                    className="size-4"
                                />
                            )}
                            <span className="truncate">
                                {detail.site_name ?? stash.domain ?? stash.url}
                            </span>
                            <ExternalLink className="size-3.5 shrink-0" />
                            <Keys action="stash.open-original" />
                        </a>
                    )}
                    {(stash.summary ?? stash.description) !== null && (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {stash.summary ?? stash.description}
                        </p>
                    )}
                </header>

                <InlineField
                    url={StashController.update.url(stash.id)}
                    name="body"
                    initial={detail.full_body ?? ''}
                    label={bodyFields[stash.type].label}
                    placeholder={bodyFields[stash.type].placeholder}
                    multiline
                    className="text-sm leading-relaxed"
                />

                <section className="grid gap-2">
                    <h2 className="text-xs text-muted-foreground">Tags</h2>
                    <TagEditor stashId={stash.id} tags={stash.tags} />
                    <SmartStatus stash={stash} />
                </section>

                <section className="grid gap-2">
                    <h2 className="text-xs text-muted-foreground">
                        Collections
                    </h2>
                    <CollectionPicker
                        stashId={stash.id}
                        selected={detail.collection_ids}
                    />
                </section>

                {detail.highlights.length > 0 && (
                    <section className="grid gap-3">
                        <h2 className="text-xs text-muted-foreground">
                            Highlights
                        </h2>
                        <HighlightList highlights={detail.highlights} />
                    </section>
                )}

                <Deferred data="similar" fallback={<></>}>
                    <MoreLikeThis stashes={similar ?? []} />
                </Deferred>

                {detail.excerpt !== null && (
                    <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground">
                            Text of the page
                        </summary>
                        <p className="mt-3 whitespace-pre-wrap text-muted-foreground">
                            {detail.excerpt}
                        </p>
                    </details>
                )}

                <div className="flex border-t pt-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() =>
                            router.delete(StashController.destroy.url(stash.id))
                        }
                    >
                        <Trash2 />
                        Delete
                        <Keys action="stash.delete" className="ml-1" />
                    </Button>
                </div>
            </div>
        </>
    );
}

/** The stashes closest to this one, as small cards. Shows nothing when there are none. */
function MoreLikeThis({ stashes }: { stashes: App.Data.StashData[] }) {
    if (stashes.length === 0) {
        return null;
    }

    return (
        <section className="grid gap-3">
            <h2 className="text-xs text-muted-foreground">More like this</h2>
            <div className="columns-1 gap-4 sm:columns-2">
                {stashes.map((stash) => (
                    <StashCard key={stash.id} stash={stash} />
                ))}
            </div>
        </section>
    );
}

/** Says what the smart features are doing with this stash, and offers to try again where that helps. */
function SmartStatus({ stash }: { stash: App.Data.StashData }) {
    const user = useAuthUser();
    const canMakeSome =
        user.ai_enabled && (stash.type === 'link' || stash.type === 'note');

    if (stash.tagging) {
        return (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-3.5" />
                Making a summary and tags…
            </p>
        );
    }

    if (stash.ai_status === 'failed' || stash.ai_error !== null) {
        return (
            <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-muted-foreground">
                    {aiErrorMessage(stash.ai_error)}
                </p>
                {stash.ai_status === 'failed' && <RetryButton id={stash.id} />}
            </div>
        );
    }

    // Saved while smart features were off (or before they existed): the person can ask for them one by one.
    if (
        stash.ai_status === 'skipped' &&
        canMakeSome &&
        stash.summary === null
    ) {
        return <RetryButton id={stash.id} label="Add a summary and tags" />;
    }

    return null;
}

function RetryButton({
    id,
    label = 'Try again',
}: {
    id: number;
    label?: string;
}) {
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() =>
                router.post(
                    StashReprocessController.store.url(id),
                    {},
                    { preserveScroll: true },
                )
            }
        >
            <RotateCw />
            {label}
        </Button>
    );
}

/** The big picture of the stash: the preview image, the color itself, or nothing for a plain note. */
function Preview({ detail }: { detail: App.Data.StashDetailData }) {
    const { stash, preview } = detail;

    if (preview !== null) {
        return (
            <img
                src={preview.url}
                alt=""
                width={preview.width ?? undefined}
                height={preview.height ?? undefined}
                className="max-h-[70svh] w-full rounded-2xl border bg-muted object-contain outline -outline-offset-1 outline-black/10"
            />
        );
    }

    if (stash.type === 'color') {
        return (
            <div
                className="h-48 rounded-2xl border"
                style={{ backgroundColor: detail.full_body ?? undefined }}
            />
        );
    }

    return null;
}
