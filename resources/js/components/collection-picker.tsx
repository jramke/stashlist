import StashCollectionController from '@/actions/App/Http/Controllers/StashCollectionController';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { router, usePage } from '@inertiajs/react';

/** Tick the collections a stash belongs to; every change is saved at once. */
export function CollectionPicker({
    stashId,
    selected,
}: {
    stashId: number;
    selected: number[];
}) {
    const { collections } = usePage().props;

    if (collections.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                You have no collections yet.
            </p>
        );
    }

    function toggle(collectionId: number, checked: boolean) {
        const next = checked
            ? [...selected, collectionId]
            : selected.filter((id) => id !== collectionId);

        router.put(
            StashCollectionController.update.url(stashId),
            { collection_ids: next },
            { preserveScroll: true },
        );
    }

    return (
        <ul className="grid gap-2">
            {collections.map((collection) => (
                <li key={collection.id} className="flex items-center gap-2">
                    <Checkbox
                        id={`collection-${collection.id}`}
                        checked={selected.includes(collection.id)}
                        onCheckedChange={(checked) =>
                            toggle(collection.id, checked)
                        }
                    />
                    <Label htmlFor={`collection-${collection.id}`}>
                        {collection.name}
                    </Label>
                </li>
            ))}
        </ul>
    );
}
