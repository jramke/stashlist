import { usePage } from '@inertiajs/react';

/** The signed-in user. Only use on pages behind the `auth` middleware. */
export function useAuthUser(): App.Data.UserData {
    const { user } = usePage().props.auth;

    if (!user) {
        throw new Error('useAuthUser() needs a signed-in user.');
    }

    return user;
}
