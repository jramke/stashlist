import StashController from '@/actions/App/Http/Controllers/StashController';
import StashReprocessController from '@/actions/App/Http/Controllers/StashReprocessController';
import { CollectionPicker } from '@/components/collection-picker';
import { HighlightList } from '@/components/highlight-list';
import InputError from '@/components/input-error';
import { StashCard } from '@/components/stash-card';
import { TagEditor } from '@/components/tag-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useAuthUser } from '@/hooks/use-auth-user';
import { aiErrorMessage } from '@/lib/ai-status';
import { index } from '@/routes/stashes';
import { Deferred, Form, Head, Link, router, usePoll } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, RotateCw, Trash2 } from 'lucide-react';
import { useEffect } from 'react';

type Props = {
    detail: App.Data.StashDetailData;
    /** Deferred: found after the page is shown. */
    similar?: App.Data.StashData[];
};

const bodyLabels = {
    link: 'Comment',
    note: 'Text',
    image: 'Comment',
    file: 'Comment',
    color: 'Color',
} satisfies Record<App.Enums.StashType, string>;

/** How often the page asks again while the stash is still being read or tagged. */
const POLL_INTERVAL = 3000;

export default function Show({ detail, similar }: Props) {
    const { stash } = detail;
    const heading = stash.title ?? (stash.type === 'note' ? 'Note' : 'Color');
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

    return (
        <>
            <Head title={heading} />

            <div className="mx-auto grid max-w-3xl gap-6">
                <Link
                    href={index()}
                    className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Stashes
                </Link>

                <Preview detail={detail} />

                <header className="grid gap-2">
                    <h1 className="text-2xl font-medium break-words">
                        {heading}
                    </h1>
                    {stash.url !== null && (
                        <a
                            href={stash.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-fit max-w-full items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
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
                        </a>
                    )}
                    {(stash.summary ?? stash.description) !== null && (
                        <p className="text-sm text-muted-foreground">
                            {stash.summary ?? stash.description}
                        </p>
                    )}
                </header>

                <Separator />

                <Form
                    {...StashController.update.form.patch(stash.id)}
                    options={{ preserveScroll: true }}
                    className="grid gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    defaultValue={stash.title ?? ''}
                                    placeholder="Leave empty to use the page's own title"
                                    maxLength={500}
                                />
                                <InputError message={errors.title} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="body">
                                    {bodyLabels[stash.type]}
                                </Label>
                                <Textarea
                                    id="body"
                                    name="body"
                                    defaultValue={detail.full_body ?? ''}
                                    rows={stash.type === 'note' ? 8 : 3}
                                />
                                <InputError message={errors.body} />
                            </div>

                            <Button
                                type="submit"
                                className="w-fit"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Save
                            </Button>
                        </>
                    )}
                </Form>

                <Separator />

                <section className="grid gap-3">
                    <h2 className="text-sm font-medium">Tags</h2>
                    <TagEditor stashId={stash.id} tags={stash.tags} />
                    <SmartStatus stash={stash} />
                </section>

                <section className="grid gap-3">
                    <h2 className="text-sm font-medium">Collections</h2>
                    <CollectionPicker
                        stashId={stash.id}
                        selected={detail.collection_ids}
                    />
                </section>

                {detail.highlights.length > 0 && (
                    <section className="grid gap-3">
                        <h2 className="text-sm font-medium">Highlights</h2>
                        <HighlightList highlights={detail.highlights} />
                    </section>
                )}

                <Separator />

                <section className="flex flex-wrap items-center gap-4">
                    <Button
                        variant="destructive"
                        className="ml-auto"
                        onClick={() =>
                            router.delete(StashController.destroy.url(stash.id))
                        }
                    >
                        <Trash2 />
                        Delete
                    </Button>
                </section>

                <Deferred data="similar" fallback={null}>
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
            <h2 className="text-sm font-medium">More like this</h2>
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
                <Spinner />
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
                className="max-h-[70svh] w-full rounded-xl border bg-muted object-contain"
            />
        );
    }

    if (stash.type === 'color') {
        return (
            <div
                className="h-48 rounded-xl border"
                style={{ backgroundColor: detail.full_body ?? undefined }}
            />
        );
    }

    return null;
}
