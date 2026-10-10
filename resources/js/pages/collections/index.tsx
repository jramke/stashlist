import { Head, usePage } from '@inertiajs/react';

export default function Index() {
    const { collections } = usePage().props;

    return (
        <>
            <Head title="Collections" />
            <ul>
                {collections.map((collection) => (
                    <li key={collection.id}>{collection.name}</li>
                ))}
            </ul>
        </>
    );
}
