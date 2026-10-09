// Keeps this file a module, so the `declare module` blocks below augment instead of replace.
export {};

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

// `App.*` types are generated from PHP by `php artisan typescript:transform` (resources/js/generated).
declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: App.Data.SharedData;
        flashDataType: { toast?: App.Data.ToastData };
    }
}
