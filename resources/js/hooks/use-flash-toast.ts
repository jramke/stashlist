import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', ({ detail }) => {
            const data = detail.flash.toast;

            if (data) {
                toast[data.type](data.message);
            }
        });
    }, []);
}
