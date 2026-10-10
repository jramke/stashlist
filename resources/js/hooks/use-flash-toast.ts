import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

/** How long a toast with an undo button stays: the server keeps a deletion open for ten seconds. */
const UNDO_DURATION = 10_000;

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', ({ detail }) => {
            const data = detail.flash.toast;

            if (!data) {
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
        });
    }, []);
}
