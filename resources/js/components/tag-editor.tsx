import StashTagController from '@/actions/App/Http/Controllers/StashTagController';
import { router } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useState } from 'react';

/** The tags of one stash as chips; type a name and press Enter to add one, press the x to take one off. */
export function TagEditor({
    stashId,
    tags,
}: {
    stashId: number;
    tags: App.Data.TagData[];
}) {
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    function add() {
        const wanted = name.trim();

        if (wanted === '') {
            return;
        }

        setName('');
        setError(null);
        router.post(
            StashTagController.store.url(stashId),
            { name: wanted },
            {
                preserveScroll: true,
                preserveState: true,
                async: true,
                onError: (errors) => {
                    setName(wanted);
                    setError(errors.name ?? 'This tag could not be added.');
                },
            },
        );
    }

    return (
        <div className="grid gap-1">
            <ul className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                    <li
                        key={tag.id}
                        className={
                            'inline-flex h-7 animate-chip-in items-center gap-1 rounded-full border pr-1 pl-3 text-sm ' +
                            (tag.source === 'ai'
                                ? 'border-dashed border-foreground/20'
                                : 'border-foreground/10 bg-muted')
                        }
                    >
                        {tag.name}
                        <button
                            type="button"
                            aria-label={`Remove ${tag.name}`}
                            className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                            onClick={() =>
                                router.delete(
                                    StashTagController.destroy.url({
                                        stash: stashId,
                                        tag: tag.id,
                                    }),
                                    {
                                        preserveScroll: true,
                                        preserveState: true,
                                        async: true,
                                    },
                                )
                            }
                        >
                            <X className="size-3" />
                        </button>
                    </li>
                ))}
                <li>
                    <input
                        data-tag-input
                        value={name}
                        aria-label="Add a tag"
                        placeholder={tags.length === 0 ? 'Add a tag' : '+ tag'}
                        autoComplete="off"
                        maxLength={100}
                        onChange={(event) => {
                            setName(event.target.value);
                            setError(null);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                add();
                            }
                        }}
                        className="h-7 w-28 rounded-full bg-transparent px-2 text-sm transition-colors outline-none placeholder:text-muted-foreground/60 hover:bg-foreground/[0.04] focus:bg-foreground/[0.04]"
                    />
                </li>
            </ul>
            {error !== null && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
