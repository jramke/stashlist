import { login, logout, register } from '@/routes';
import { edit } from '@/routes/profile';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Welcome" />
            <nav className="flex items-center justify-end gap-4 p-6 text-sm">
                {auth.user ? (
                    <>
                        <Link href={edit()}>Profile</Link>
                        <Link href={logout()} as="button">
                            Log out
                        </Link>
                    </>
                ) : (
                    <>
                        <Link href={login()}>Log in</Link>
                        <Link href={register()}>Register</Link>
                    </>
                )}
            </nav>
        </>
    );
}
