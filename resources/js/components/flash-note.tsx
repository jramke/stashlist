import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Check, Info, TriangleAlert } from 'lucide-react';

/**
 * A short note from the server ("Saved.", "Deleted.") at the place of the change. It swaps with a quick blur
 * and fade, so a second note does not look like the first one standing still.
 */
export function FlashNote({
    note,
    onDone,
    className,
}: {
    note: App.Data.ToastData | null;
    onDone?: () => void;
    className?: string;
}) {
    if (note === null) {
        return null;
    }

    const Icon =
        note.type === 'error'
            ? TriangleAlert
            : note.type === 'info'
              ? Info
              : Check;
    const undoUrl = note.undo_url;

    return (
        <span
            // The message is the key: a new message plays the entrance again.
            key={note.message}
            role="status"
            className={cn(
                'inline-flex animate-note-in items-center gap-1.5 text-sm text-muted-foreground',
                note.type === 'error' && 'text-destructive',
                className,
            )}
        >
            <Icon className="size-3.5 shrink-0" />
            {note.message}
            {undoUrl !== null && (
                <button
                    type="button"
                    className="rounded px-1 font-medium text-foreground underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    onClick={() => {
                        router.delete(undoUrl, { preserveScroll: true });
                        onDone?.();
                    }}
                >
                    Undo
                </button>
            )}
        </span>
    );
}
