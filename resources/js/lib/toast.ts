import type { ExternalToast } from 'sonner';

export type ToastKind = 'success' | 'info' | 'warning' | 'error';

/**
 * Shows a toast. The toast library is a chunk of its own that is fetched after the page (the toaster, see
 * `components/toaster.tsx`) or on the first toast, so the first visit does not carry it.
 */
export function notify(
    kind: ToastKind | 'message',
    message: string,
    options?: ExternalToast,
): void {
    void import('sonner').then(({ toast }) => {
        if (kind === 'message') {
            toast(message, options);
        } else {
            toast[kind](message, options);
        }
    });
}
