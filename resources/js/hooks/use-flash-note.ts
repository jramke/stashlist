import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/** How long a short note stays, and how long one with an Undo button does: the server keeps a deletion open for ten seconds. */
const NOTE_DURATION = 2600;
const UNDO_DURATION = 10_000;

let sinks = 0;

/** True while some part of the page shows the server's notes itself, so the toast stays away. */
export function hasFlashSink(): boolean {
    return sinks > 0;
}

/**
 * The note the server flashed after the last change, shown where the person made it instead of in a toast.
 * Mount it once per page, next to the thing that changes; pages without one fall back to a toast.
 */
export function useFlashNote(): {
    note: App.Data.ToastData | null;
    clear: () => void;
} {
    const { flash } = usePage();
    const [note, setNote] = useState<App.Data.ToastData | null>(null);
    const timer = useRef<number>(undefined);

    useEffect(() => {
        sinks += 1;

        return () => {
            sinks -= 1;
            clearTimeout(timer.current);
        };
    }, []);

    const toast = flash.toast;

    useEffect(() => {
        if (!toast) {
            return;
        }

        setNote(toast);
        clearTimeout(timer.current);
        timer.current = window.setTimeout(
            () => setNote(null),
            toast.undo_url === null ? NOTE_DURATION : UNDO_DURATION,
        );
    }, [toast]);

    return { note, clear: () => setNote(null) };
}
