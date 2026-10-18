import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/** How long after the last keystroke a field saves itself. */
const SAVE_DELAY = 700;

const SAVE_FAILED = 'This could not be saved.';

/**
 * A field that is the text itself: no label, no Save button. It saves a moment after the last keystroke and
 * when it loses the focus, and the server's "Saved." shows up wherever the page keeps its note.
 *
 * What is in the field is the truth. The server's word (`initial`) replaces it only when the person has left the
 * text alone since that word was last seen and no save is out: until the answer to a save arrives, `initial`
 * still holds the old text, and a field that followed it would show that text again.
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
    // The last word of the server this field looked at, so a change of it is noticed (a title arrives, the page
    // was read).
    const [seen, setSeen] = useState(initial);
    // How many saves are out.
    const [saving, setSaving] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const timer = useRef<number>(undefined);
    // What the server holds once the saves that left have landed: the last text sent, or its own word when none
    // is out (so a save that failed is tried again).
    const sent = useRef(initial);

    if (initial !== seen) {
        setSeen(initial);

        if (value === seen && saving === 0) {
            setValue(initial);
        }
    }

    useEffect(() => {
        if (saving === 0) {
            sent.current = initial;
        }
    }, [initial, saving]);

    useEffect(() => () => clearTimeout(timer.current), []);

    function save(next: string) {
        clearTimeout(timer.current);

        if (next === sent.current) {
            return;
        }

        sent.current = next;
        setError(null);
        setSaving((count) => count + 1);
        router.patch(
            url,
            { [name]: next },
            {
                preserveScroll: true,
                preserveState: true,
                // Not cancelled by the next click: a save is not a visit.
                async: true,
                onError: (errors) => setError(errors[name] ?? SAVE_FAILED),
                // A server or network error is told here, with the text still in the field, not as an error page.
                onHttpException: () => {
                    setError(SAVE_FAILED);

                    return false;
                },
                onNetworkError: () => {
                    setError(SAVE_FAILED);

                    return false;
                },
                onFinish: () => setSaving((count) => count - 1),
            },
        );
    }

    function change(field: HTMLInputElement | HTMLTextAreaElement) {
        setValue(field.value);
        clearTimeout(timer.current);
        // The field is read when the time is up: if the server's word took the text's place meanwhile, that is
        // what is there, and it needs no save.
        timer.current = window.setTimeout(() => save(field.value), SAVE_DELAY);
    }

    const shared = {
        name,
        value,
        placeholder,
        'aria-label': label,
        'aria-invalid': error !== null || undefined,
        // What is in the field, not what the last render saw: a blur right after a keystroke is ahead of the render.
        onBlur: (event: { currentTarget: { value: string } }) =>
            save(event.currentTarget.value),
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
                    onChange={(event) => change(event.currentTarget)}
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
                    onChange={(event) => change(event.currentTarget)}
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
