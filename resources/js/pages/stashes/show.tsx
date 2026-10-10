import { Head } from '@inertiajs/react';

type Props = {
    detail: App.Data.StashDetailData;
};

export default function Show({ detail }: Props) {
    return (
        <>
            <Head title={detail.stash.title} />
            <h1>{detail.stash.title}</h1>
        </>
    );
}
