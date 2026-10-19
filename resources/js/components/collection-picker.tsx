import StashCollectionController from '@/actions/App/Http/Controllers/StashCollectionController';
import { cn } from '@/lib/utils';
import { router, usePage } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useState } from 'react';

const SAVE_FAILED = 'This could not be saved.';

/**
 * The collections as pills; press one to put the stash in it or take it out. Every press is saved at once, and
 * shows at once: it is an optimistic update of the page's list (`detail.collection_ids`), so the pills have no
 * state of their own. While a press is out, Inertia keeps every other answer from replacing the list (an answer
 * to a tag, a poll: their copy of it is still the old one), and puts the old list back if the server refuses.
 */
export function CollectionPicker({
    stashId,
    selected,
}: {
    stashId: number;
    selected: number[];
}) {
    const { collections } = usePage().props;
    const [error, setError] = useState<string | null>(null);

    if (collections.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                You have no collections yet.
            </p>
        );
    }

    function toggle(collectionId: number) {
        const next = selected.includes(collectionId)
            ? selected.filter((id) => id !== collectionId)
            : [...selected, collectionId];
        // A server or network error is told here, under the pills, not as an error page.
        const failed = () => {
            setError(SAVE_FAILED);

            return false;
        };

        setError(null);
        router
            .optimistic<{ detail: App.Data.StashDetailData }>((props) => ({
                detail: { ...props.detail, collection_ids: next },
            }))
            .put(
                StashCollectionController.update.url(stashId),
                { collection_ids: next },
                {
                    preserveScroll: true,
                    // A press is not a visit: no bar across the top.
                    showProgress: false,
                    onError: failed,
                    onHttpException: failed,
                    onNetworkError: failed,
                },
            );
    }

    return (
        <div className="grid gap-1">
            <ul className="flex flex-wrap gap-1.5">
                {collections.map((collection) => {
                    const on = selected.includes(collection.id);

                    return (
                        <li key={collection.id}>
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={on}
                                onClick={() => toggle(collection.id)}
                                className={cn(
                                    'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-sm transition-[background-color,border-color,color,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95',
                                    on
                                        ? 'border-foreground bg-foreground text-background'
                                        : 'border-foreground/10 text-muted-foreground hover:border-foreground/25 hover:text-foreground',
                                )}
                            >
                                {on && <Check className="-ml-1 size-3.5" />}
                                {collection.name}
                            </button>
                        </li>
                    );
                })}
            </ul>
            {error !== null && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
