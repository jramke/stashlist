import { Head, usePage } from '@inertiajs/react';

/**
 * The tags crawlers and link previews read: title, description and Open Graph. The tags are rendered on the server,
 * so they are in the HTML a crawler gets.
 */
export function Seo({
    title,
    description,
    path,
    children,
}: {
    title: string;
    description: string;
    path: string;
    children?: React.ReactNode;
}) {
    const { name, url } = usePage().props;

    return (
        <Head title={title}>
            <meta name="description" content={description} />
            <meta property="og:site_name" content={name} />
            <meta property="og:type" content="website" />
            <meta property="og:title" content={`${title} - ${name}`} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={`${url}${path}`} />
            <meta property="og:image" content={`${url}/og.png`} />
            <meta name="twitter:card" content="summary_large_image" />
            <link rel="canonical" href={`${url}${path}`} />
            {children}
        </Head>
    );
}
