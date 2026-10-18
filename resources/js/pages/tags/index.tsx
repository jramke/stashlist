import TagController from '@/actions/App/Http/Controllers/TagController';
import { ConfirmButton } from '@/components/confirm-button';
import { FlashNote } from '@/components/flash-note';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFlashNote } from '@/hooks/use-flash-note';
import { index as stashes } from '@/routes/stashes';
import { Form, Head, Link, router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

type Props = {
    tags: App.Data.TagData[];
};

/** Folds the tag into another one: pick the other tag, then say yes right where the list was. */
function MergeInto({
    tag,
    others,
}: {
    tag: App.Data.TagData;
    others: App.Data.TagData[];
}) {
    const [target, setTarget] = useState<App.Data.TagData | null>(null);

    if (target !== null) {
        return (
            <span className="flex items-center gap-1 pt-0.5 text-sm">
                <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                        router.post(
                            TagController.merge.url(tag.id),
                            { into: target.id },
                            { preserveScroll: true },
                        );
                        setTarget(null);
                    }}
                >
                    Merge into {target.name}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTarget(null)}
                >
                    Cancel
                </Button>
            </span>
        );
    }

    return (
        <select
            aria-label={`Merge ${tag.name} into`}
            defaultValue=""
            className="h-9 max-w-32 rounded-md border bg-transparent px-2 text-sm"
            onChange={(event) => {
                setTarget(
                    others.find(
                        (other) => other.id === Number(event.target.value),
                    ) ?? null,
                );
                event.target.value = '';
            }}
        >
            <option value="" disabled>
                Merge into…
            </option>
            {others
                .filter((other) => other.id !== tag.id)
                .map((other) => (
                    <option key={other.id} value={other.id}>
                        {other.name}
                    </option>
                ))}
        </select>
    );
}

export default function Index({ tags }: Props) {
    const { note, clear } = useFlashNote();

    return (
        <>
            <Head title="Tags" />

            <div className="mx-auto grid max-w-2xl gap-8">
                <header className="grid gap-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-medium">Tags</h1>
                        <FlashNote note={note} onDone={clear} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Rename a tag to change it on every stash, or merge it
                        into another. Deleting a tag only removes it from the
                        stashes.
                    </p>
                </header>

                {tags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No tags yet. Add one on a stash.
                    </p>
                ) : (
                    <ul className="grid gap-2">
                        {tags.map((tag) => (
                            <li
                                key={tag.id}
                                className="flex items-start gap-2 rounded-xl border p-3"
                            >
                                <Form
                                    {...TagController.update.form.patch(tag.id)}
                                    options={{ preserveScroll: true }}
                                    className="flex flex-1 gap-2"
                                >
                                    {({ errors }) => (
                                        <div className="grid flex-1 gap-1">
                                            <div className="flex gap-2">
                                                <Input
                                                    name="name"
                                                    aria-label={`Name of ${tag.name}`}
                                                    defaultValue={tag.name}
                                                    maxLength={100}
                                                    required
                                                />
                                                <Button
                                                    type="submit"
                                                    variant="outline"
                                                >
                                                    Rename
                                                </Button>
                                            </div>
                                            <InputError message={errors.name} />
                                        </div>
                                    )}
                                </Form>

                                <Link
                                    href={stashes({ query: { tag: [tag.id] } })}
                                    className="pt-1.5 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground"
                                >
                                    {tag.stashes_count}{' '}
                                    {tag.stashes_count === 1
                                        ? 'stash'
                                        : 'stashes'}
                                </Link>

                                {tags.length > 1 && (
                                    <MergeInto tag={tag} others={tags} />
                                )}

                                <ConfirmButton
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Delete ${tag.name}`}
                                    confirmLabel="?"
                                    onConfirm={() =>
                                        router.delete(
                                            TagController.destroy.url(tag.id),
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <Trash2 />
                                </ConfirmButton>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
