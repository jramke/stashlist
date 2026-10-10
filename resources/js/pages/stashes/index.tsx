import { Head, Link } from '@inertiajs/react';

type Props = {
    stashes: { data: App.Data.StashData[] };
    filters: App.Data.FeedFiltersData;
    tags: App.Data.TagData[];
};

export default function Index({ stashes }: Props) {
    return (
        <>
            <Head title="Stashes" />
            <ul>
                {stashes.data.map((stash) => (
                    <li key={stash.id}>
                        <Link href={`/stashes/${stash.id}`}>{stash.title}</Link>
                    </li>
                ))}
            </ul>
        </>
    );
}
