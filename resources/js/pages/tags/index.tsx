import TagController from '@/actions/App/Http/Controllers/TagController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { index as stashes } from '@/routes/stashes';
import { Form, Head, Link, router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';

type Props = {
    tags: App.Data.TagData[];
};

/** Folds the tag into another one: pick the other tag from the list. */
function MergeInto({
    tag,
    others,
}: {
    tag: App.Data.TagData;
    others: App.Data.TagData[];
}) {
    return (
        <select
            aria-label={`Merge ${tag.name} into`}
            defaultValue=""
            className="h-9 max-w-32 rounded-md border bg-transparent px-2 text-sm"
            onChange={(event) => {
                const target = others.find(
                    (other) => other.id === Number(event.target.value),
                );
                event.target.value = '';

                if (
                    target !== undefined &&
                    confirm(
                        `Merge "${tag.name}" into "${target.name}"? The tag "${tag.name}" goes away and its stashes get "${target.name}".`,
                    )
                ) {
                    router.post(
                        TagController.merge.url(tag.id),
                        { into: target.id },
                        { preserveScroll: true },
                    );
                }
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
    return (
        <>
            <Head title="Tags" />

            <div className="mx-auto grid max-w-2xl gap-8">
                <header className="grid gap-1">
                    <h1 className="text-2xl font-medium">Tags</h1>
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

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Delete ${tag.name}`}
                                    onClick={() => {
                                        if (
                                            confirm(
                                                `Delete the tag "${tag.name}"? The stashes stay.`,
                                            )
                                        ) {
                                            router.delete(
                                                TagController.destroy.url(
                                                    tag.id,
                                                ),
                                                { preserveScroll: true },
                                            );
                                        }
                                    }}
                                >
                                    <Trash2 />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
