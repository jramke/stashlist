import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { hasFlashSink } from './use-flash-note';

/** How long a toast with an undo button stays: the server keeps a deletion open for ten seconds. */
const UNDO_DURATION = 10_000;

/** The page that was just opened mounts its inline note a moment after the flash arrives; give it that moment. */
const SINK_GRACE = 120;

/** The fallback for notes no page shows inline: the toast. */
export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', ({ detail }) => {
            const data = detail.flash.toast;

            if (!data) {
                return;
            }

            window.setTimeout(() => {
                if (hasFlashSink()) {
                    return;
                }

                const undoUrl = data.undo_url;

                toast[data.type](
                    data.message,
                    undoUrl === null
                        ? undefined
                        : {
                              duration: UNDO_DURATION,
                              action: {
                                  label: 'Undo',
                                  onClick: () => router.delete(undoUrl),
                              },
                          },
                );
            }, SINK_GRACE);
        });
    }, []);
}
