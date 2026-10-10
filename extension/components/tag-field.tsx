import type { Client } from '@/lib/api';
import { useEffect, useId, useState } from 'react';
import { Input } from './ui';

/**
 * Tags as chips. Type a name and press Enter or comma to add it; the browser offers the person's own tags while
 * typing (a datalist), most used first.
 */
export function TagField({
    client,
    tags,
    onChange,
}: {
    client: Client | null;
    tags: string[];
    onChange: (tags: string[]) => void;
}) {
    const listId = useId();
    const [draft, setDraft] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        if (client === null) {
            return;
        }

        const timer = setTimeout(() => {
            client
                .tags(draft.trim())
                .then((found) => setSuggestions(found.map((tag) => tag.name)))
                .catch(() => setSuggestions([]));
        }, 150);

        return () => clearTimeout(timer);
    }, [client, draft]);

    function commit(): void {
        const name = draft.trim().replace(/,+$/, '').trim();

        if (
            name !== '' &&
            !tags.some((tag) => tag.toLowerCase() === name.toLowerCase())
        ) {
            onChange([...tags, name]);
        }

        setDraft('');
    }

    return (
        <div className="grid gap-2">
            {tags.length > 0 && (
                <ul className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                        <li
                            key={tag}
                            className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
                        >
                            {tag}
                            <button
                                type="button"
                                aria-label={`Remove ${tag}`}
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                    onChange(
                                        tags.filter((other) => other !== tag),
                                    )
                                }
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <Input
                aria-label="Add a tag"
                placeholder="Add a tag"
                list={listId}
                value={draft}
                autoComplete="off"
                onChange={(event) => {
                    if (event.target.value.endsWith(',')) {
                        setDraft(event.target.value);
                        commit();
                    } else {
                        setDraft(event.target.value);
                    }
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        commit();
                    }
                }}
                onBlur={commit}
            />
            <datalist id={listId}>
                {suggestions.map((name) => (
                    <option key={name} value={name} />
                ))}
            </datalist>
        </div>
    );
}
