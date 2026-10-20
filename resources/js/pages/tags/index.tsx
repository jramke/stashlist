import TagController from '@/actions/App/Http/Controllers/TagController';
import { ConfirmButton } from '@/components/confirm-button';
import { FlashNote } from '@/components/flash-note';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFlashNote } from '@/hooks/use-flash-note';
import { index as stashes } from '@/routes/stashes';
import { index as tagsIndex } from '@/routes/tags';
import { Form, Head, Link, router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

type Props = {
    tags: App.Data.TagData[];
    paging: App.Data.PagingData;
    q: string | null;
    /** Every tag, for the merge picker: only there once somebody asked for it. */
    options?: App.Data.TagData[];
};

/** The address of a page of the list, with the search that is on. */
function pageUrl(page: number, q: string | null): string {
    const query: Record<string, string | number> = {};

    if (q !== null) {
        query.q = q;
    }

    if (page > 1) {
        query.page = page;
    }

    return tagsIndex({ query }).url;
}

/**
 * Folds the tag into another one: type the name of the other tag (the list of names is a datalist of the page, asked
 * for when the field is first used), then say yes right where the list was.
 */
function MergeInto({
    tag,
    options,
    load,
}: {
    tag: App.Data.TagData;
    options: App.Data.TagData[] | undefined;
    load: () => void;
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

    /** Takes what is typed for a tag when it is the whole name of another one. */
    const take = (field: HTMLInputElement) => {
        const wanted = field.value.trim().toLowerCase();
        const found = options?.find(
            (other) =>
                other.id !== tag.id && other.name.toLowerCase() === wanted,
        );

        if (found !== undefined) {
            setTarget(found);
            field.value = '';
        }
    };

    return (
        <Input
            aria-label={`Merge ${tag.name} into`}
            list="tag-options"
            placeholder="Merge into…"
            autoComplete="off"
            className="h-9 w-32"
            onFocus={load}
            onChange={(event) => {
                // A name picked from the list of the browser is taken at once; typing waits for Enter or the end
                // of the field, because "garden" is also the start of "garden tools".
                if (
                    event.nativeEvent instanceof InputEvent &&
                    event.nativeEvent.inputType === 'insertReplacementText'
                ) {
                    take(event.currentTarget);
                }
            }}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    take(event.currentTarget);
                }
            }}
            onBlur={(event) => take(event.currentTarget)}
        />
    );
}

export default function Index({ tags, paging, q, options }: Props) {
    const { note, clear } = useFlashNote();
    const timer = useRef<number>(undefined);

    /** Looks for the words after a short pause, from the first page, and keeps the field and the scroll as they are. */
    function search(text: string) {
        clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            const wanted = text.trim();

            router.get(tagsIndex().url, wanted === '' ? {} : { q: wanted }, {
                only: ['tags', 'paging', 'q'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 250);
    }

    /** The names for the merge fields are fetched once, when the first of them is used. */
    function loadOptions() {
        if (options === undefined) {
            router.reload({ only: ['options'] });
        }
    }

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

                {(paging.total > 0 || q !== null) && (
                    <Input
                        type="search"
                        name="q"
                        aria-label="Search tags"
                        placeholder="Search tags"
                        autoComplete="off"
                        defaultValue={q ?? ''}
                        onChange={(event) => search(event.target.value)}
                    />
                )}

                {tags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {q === null
                            ? 'No tags yet. Add one on a stash.'
                            : `No tag has "${q}" in its name.`}
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

                                {paging.total > 1 && (
                                    <MergeInto
                                        tag={tag}
                                        options={options}
                                        load={loadOptions}
                                    />
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

                {options !== undefined && (
                    <datalist id="tag-options">
                        {options.map((option) => (
                            <option key={option.id} value={option.name} />
                        ))}
                    </datalist>
                )}

                {paging.total > 0 && (
                    <nav
                        aria-label="Pages"
                        className="flex items-center gap-4 text-sm text-muted-foreground"
                    >
                        <span>
                            {paging.total.toLocaleString('en')}{' '}
                            {paging.total === 1 ? 'tag' : 'tags'}
                            {q === null ? '' : ` with "${q}"`}
                        </span>

                        {paging.last_page > 1 && (
                            <span className="ml-auto flex items-center gap-3">
                                {paging.page > 1 ? (
                                    <Link
                                        href={pageUrl(paging.page - 1, q)}
                                        className="hover:text-foreground"
                                    >
                                        Previous
                                    </Link>
                                ) : (
                                    <span className="opacity-50">Previous</span>
                                )}
                                <span>
                                    Page {paging.page} of {paging.last_page}
                                </span>
                                {paging.page < paging.last_page ? (
                                    <Link
                                        href={pageUrl(paging.page + 1, q)}
                                        className="hover:text-foreground"
                                    >
                                        Next
                                    </Link>
                                ) : (
                                    <span className="opacity-50">Next</span>
                                )}
                            </span>
                        )}
                    </nav>
                )}
            </div>
        </>
    );
}
