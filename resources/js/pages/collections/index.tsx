import CollectionController from '@/actions/App/Http/Controllers/CollectionController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { index as stashes } from '@/routes/stashes';
import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';

export default function Index() {
    const { collections } = usePage().props;

    return (
        <>
            <Head title="Collections" />

            <div className="mx-auto grid max-w-2xl gap-8">
                <header className="grid gap-1">
                    <h1 className="text-2xl font-medium">Collections</h1>
                    <p className="text-sm text-muted-foreground">
                        A stash can be in several collections, or in none.
                    </p>
                </header>

                <Form
                    {...CollectionController.store.form()}
                    resetOnSuccess
                    options={{ preserveScroll: true }}
                    className="grid gap-2"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="flex gap-2">
                                <Input
                                    name="name"
                                    aria-label="Name of a new collection"
                                    placeholder="New collection"
                                    maxLength={100}
                                    required
                                />
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Create
                                </Button>
                            </div>
                            <InputError message={errors.name} />
                        </>
                    )}
                </Form>

                {collections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No collections yet.
                    </p>
                ) : (
                    <ul className="grid gap-3">
                        {collections.map((collection) => (
                            <li
                                key={collection.id}
                                className="grid gap-2 rounded-xl border p-3"
                            >
                                <Form
                                    {...CollectionController.update.form.patch(
                                        collection.id,
                                    )}
                                    options={{ preserveScroll: true }}
                                    className="flex gap-2"
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <div className="grid flex-1 gap-1">
                                                <Input
                                                    name="name"
                                                    aria-label={`Name of ${collection.name}`}
                                                    defaultValue={
                                                        collection.name
                                                    }
                                                    maxLength={100}
                                                    required
                                                />
                                                <InputError
                                                    message={errors.name}
                                                />
                                            </div>
                                            <Button
                                                type="submit"
                                                variant="outline"
                                                disabled={processing}
                                            >
                                                Rename
                                            </Button>
                                        </>
                                    )}
                                </Form>

                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <Link
                                        href={stashes({
                                            query: {
                                                collection: collection.id,
                                            },
                                        })}
                                        className="hover:text-foreground"
                                    >
                                        {collection.stashes_count}{' '}
                                        {collection.stashes_count === 1
                                            ? 'stash'
                                            : 'stashes'}
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="ml-auto"
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    `Delete the collection "${collection.name}"? The stashes in it stay.`,
                                                )
                                            ) {
                                                router.delete(
                                                    CollectionController.destroy.url(
                                                        collection.id,
                                                    ),
                                                    { preserveScroll: true },
                                                );
                                            }
                                        }}
                                    >
                                        <Trash2 />
                                        Delete
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
