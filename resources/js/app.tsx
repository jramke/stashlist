import { Toaster } from '@/components/ui/sonner';
import AuthLayout from '@/layouts/auth-layout';
import { createInertiaApp } from '@inertiajs/react';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => (name === 'welcome' ? null : AuthLayout),
    strictMode: true,
    withApp(app) {
        return (
            <>
                {app}
                <Toaster />
            </>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
