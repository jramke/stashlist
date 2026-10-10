import StashTagController from '@/actions/App/Http/Controllers/StashTagController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, router } from '@inertiajs/react';
import { X } from 'lucide-react';

/** The tags of one stash: remove a tag with its x, add one by typing a name. */
export function TagEditor({
    stashId,
    tags,
}: {
    stashId: number;
    tags: App.Data.TagData[];
}) {
    return (
        <div className="grid gap-3">
            {tags.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                        <li key={tag.id}>
                            <Badge
                                variant={
                                    tag.source === 'ai'
                                        ? 'outline'
                                        : 'secondary'
                                }
                                className="h-6 gap-1 pr-1"
                            >
                                {tag.name}
                                <button
                                    type="button"
                                    aria-label={`Remove ${tag.name}`}
                                    className="rounded-full p-0.5 hover:bg-foreground/10"
                                    onClick={() =>
                                        router.delete(
                                            StashTagController.destroy.url({
                                                stash: stashId,
                                                tag: tag.id,
                                            }),
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <X className="size-3" />
                                </button>
                            </Badge>
                        </li>
                    ))}
                </ul>
            )}

            <Form
                {...StashTagController.store.form(stashId)}
                resetOnSuccess
                options={{ preserveScroll: true }}
                className="grid gap-1"
            >
                {({ errors }) => (
                    <>
                        <div className="flex gap-2">
                            <Input
                                name="name"
                                aria-label="Add a tag"
                                placeholder="Add a tag"
                                autoComplete="off"
                                maxLength={100}
                            />
                            <Button type="submit" variant="outline">
                                Add
                            </Button>
                        </div>
                        <InputError message={errors.name} />
                    </>
                )}
            </Form>
        </div>
    );
}
