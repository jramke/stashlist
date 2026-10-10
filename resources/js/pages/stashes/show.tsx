import StashController from '@/actions/App/Http/Controllers/StashController';
import StashReprocessController from '@/actions/App/Http/Controllers/StashReprocessController';
import { CollectionPicker } from '@/components/collection-picker';
import { HighlightList } from '@/components/highlight-list';
import InputError from '@/components/input-error';
import { TagEditor } from '@/components/tag-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { index } from '@/routes/stashes';
import { Form, Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, RotateCw, Trash2 } from 'lucide-react';

type Props = {
    detail: App.Data.StashDetailData;
};

const bodyLabels = {
    link: 'Comment',
    note: 'Text',
    image: 'Comment',
    file: 'Comment',
    color: 'Color',
} satisfies Record<App.Enums.StashType, string>;

export default function Show({ detail }: Props) {
    const { stash } = detail;
    const heading = stash.title ?? (stash.type === 'note' ? 'Note' : 'Color');

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
                    {stash.description !== null && (
                        <p className="text-sm text-muted-foreground">
                            {stash.description}
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
                    {stash.ai_status === 'failed' && (
                        <Button
                            variant="outline"
                            onClick={() =>
                                router.post(
                                    StashReprocessController.store.url(
                                        stash.id,
                                    ),
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            <RotateCw />
                            Try again
                        </Button>
                    )}

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
