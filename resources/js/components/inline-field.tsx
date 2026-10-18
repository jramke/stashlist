import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/** How long after the last keystroke a field saves itself. */
const SAVE_DELAY = 700;

/**
 * A field that is the text itself: no label, no Save button. It saves a moment after the last keystroke and
 * when it loses the focus, and the server's "Saved." shows up wherever the page keeps its note.
 */
export function InlineField({
    url,
    name,
    initial,
    label,
    placeholder,
    multiline = false,
    className,
}: {
    url: string;
    name: 'title' | 'body';
    initial: string;
    label: string;
    placeholder: string;
    multiline?: boolean;
    className?: string;
}) {
    const [value, setValue] = useState(initial);
    // The last value the server knows. When the server changes it (a title arrives, the page was read), an
    // untouched field follows; one with unsaved text keeps it.
    const [known, setKnown] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const timer = useRef<number>(undefined);

    if (initial !== known) {
        setKnown(initial);

        if (value === known) {
            setValue(initial);
        }
    }

    useEffect(() => () => clearTimeout(timer.current), []);

    function save(next: string) {
        clearTimeout(timer.current);

        if (next === known) {
            return;
        }

        setKnown(next);
        setError(null);
        router.patch(
            url,
            { [name]: next },
            {
                preserveScroll: true,
                preserveState: true,
                // Not cancelled by the next click: a save is not a visit.
                async: true,
                onError: (errors) => {
                    setKnown(initial);
                    setError(errors[name] ?? 'This could not be saved.');
                },
            },
        );
    }

    function change(next: string) {
        setValue(next);
        clearTimeout(timer.current);
        timer.current = window.setTimeout(save, SAVE_DELAY, next);
    }

    const shared = {
        name,
        value,
        placeholder,
        'aria-label': label,
        'aria-invalid': error !== null || undefined,
        onBlur: () => save(value),
        className: cn(
            '-mx-2 w-[calc(100%+1rem)] rounded-lg bg-transparent px-2 py-1 transition-colors outline-none placeholder:text-muted-foreground/60 hover:bg-foreground/[0.04] focus:bg-foreground/[0.04] aria-invalid:text-destructive',
            className,
        ),
    };

    return (
        <div className="grid gap-1">
            {multiline ? (
                <textarea
                    {...shared}
                    rows={1}
                    onChange={(event) => change(event.target.value)}
                    className={cn(
                        shared.className,
                        'field-sizing-content min-h-9 resize-none',
                    )}
                />
            ) : (
                <input
                    {...shared}
                    maxLength={500}
                    autoComplete="off"
                    onChange={(event) => change(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.currentTarget.blur();
                        }
                    }}
                />
            )}
            {error !== null && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
