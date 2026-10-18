import StashCollectionController from '@/actions/App/Http/Controllers/StashCollectionController';
import { cn } from '@/lib/utils';
import { router, usePage } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useState } from 'react';

/** The collections as pills; press one to put the stash in it or take it out. Every press is saved at once. */
export function CollectionPicker({
    stashId,
    selected,
}: {
    stashId: number;
    selected: number[];
}) {
    const { collections } = usePage().props;
    const [ids, setIds] = useState(selected);
    const [known, setKnown] = useState(selected);

    // The server's list wins whenever it arrives.
    if (selected !== known) {
        setKnown(selected);
        setIds(selected);
    }

    if (collections.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                You have no collections yet.
            </p>
        );
    }

    function toggle(collectionId: number) {
        const next = ids.includes(collectionId)
            ? ids.filter((id) => id !== collectionId)
            : [...ids, collectionId];

        setIds(next);
        router.put(
            StashCollectionController.update.url(stashId),
            { collection_ids: next },
            { preserveScroll: true, preserveState: true, async: true },
        );
    }

    return (
        <ul className="flex flex-wrap gap-1.5">
            {collections.map((collection) => {
                const on = ids.includes(collection.id);

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
    );
}
