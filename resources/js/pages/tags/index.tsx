import { Head } from '@inertiajs/react';

type Props = {
    tags: App.Data.TagData[];
};

export default function Index({ tags }: Props) {
    return (
        <>
            <Head title="Tags" />
            <ul>
                {tags.map((tag) => (
                    <li key={tag.id}>
                        {tag.name} ({tag.stashes_count})
                    </li>
                ))}
            </ul>
        </>
    );
}
