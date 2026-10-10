import { PageHeader } from '@/components/marketing';
import { Seo } from '@/components/seo';
import MarketingLayout from '@/layouts/marketing-layout';
import type { ReactNode } from 'react';

type Props = {
    entries: { version: string; date: string | null; notes: string[] }[];
};

export default function Changelog({ entries }: Props) {
    return (
        <>
            <Seo
                title="Changelog"
                description="What changed in Stashlist, newest first."
                path="/changelog"
            />

            <PageHeader title="Changelog">
                What changed, newest first.
            </PageHeader>

            <div className="grid max-w-2xl gap-10">
                {entries.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Nothing written down yet.
                    </p>
                )}
                {entries.map((entry) => (
                    <section key={entry.version} className="grid gap-3">
                        <h2 className="flex items-baseline gap-3 text-lg font-medium">
                            {entry.version}
                            {entry.date !== null && (
                                <span className="text-sm font-normal text-muted-foreground">
                                    {entry.date}
                                </span>
                            )}
                        </h2>
                        <ul className="grid list-disc gap-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                            {entry.notes.map((note) => (
                                <li key={note}>{note}</li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </>
    );
}

Changelog.layout = (page: ReactNode) => (
    <MarketingLayout>{page}</MarketingLayout>
);
