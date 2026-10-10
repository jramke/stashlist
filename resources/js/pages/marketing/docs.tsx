import { Code, PageHeader, Section } from '@/components/marketing';
import { Seo } from '@/components/seo';
import MarketingLayout from '@/layouts/marketing-layout';
import type { ReactNode } from 'react';

type Props = {
    marketing: App.Data.MarketingData;
};

export default function Docs({ marketing }: Props) {
    return (
        <>
            <Seo
                title="Docs"
                description="Host Stashlist yourself: a Docker Compose file, five minutes, and what to know about backups and updates."
                path="/docs"
            />

            <PageHeader title="Docs">
                Hosting it yourself, in five minutes.
            </PageHeader>

            <div className="grid max-w-2xl gap-8">
                <Section title="You need">
                    <p>
                        Docker with Compose and a machine with about 2 GB of RAM
                        to spare. Nothing else: the database, the queue and the
                        search engine come in the compose file.
                    </p>
                </Section>

                <Section title="Start">
                    {marketing.repository_url !== '' && (
                        <Code>{`git clone ${marketing.repository_url} stashlist && cd stashlist`}</Code>
                    )}
                    <Code>{`cp .env.docker.example .env
# fill in APP_KEY and the three passwords (the file says how to make them)
docker compose up -d --build`}</Code>
                    <p>
                        Open <code>http://localhost:8080</code> and register:
                        the first account is always allowed. After that{' '}
                        <code>STASHLIST_REGISTRATION</code> decides who may
                        join: <code>closed</code>, <code>invite</code> (a link
                        from <code>php artisan stashlist:invite</code>) or{' '}
                        <code>open</code>.
                    </p>
                </Section>

                <Section title="Summaries, tags and search by meaning">
                    <p>
                        They need an AI provider. Put{' '}
                        <code>OPENAI_API_KEY</code> in <code>.env</code> and
                        they switch on. Another provider or a local model
                        (Ollama, or anything that speaks the OpenAI protocol) is
                        a matter of <code>STASHLIST_LLM</code> and the matching
                        keys. Without one, everything else works and search is
                        by words.
                    </p>
                </Section>

                <Section title="Behind a domain">
                    <p>
                        Put a reverse proxy with TLS in front of the{' '}
                        <code>app</code> service and set <code>APP_URL</code> to
                        the public address. Files are kept in a volume; set{' '}
                        <code>FILESYSTEM_DISK=s3</code> and the{' '}
                        <code>AWS_*</code> settings to use object storage
                        instead.
                    </p>
                </Section>

                <Section title="Updating and backups">
                    <Code>{`git pull && docker compose up -d --build`}</Code>
                    <p>
                        The app migrates the database and the search settings on
                        start. Back up the database every day and the original
                        files every week; the search index is rebuilt from the
                        database and needs no backup. The guide in the
                        repository (<code>docs/operations.md</code>) has the
                        commands, and a restore drill to prove your backups
                        work.
                    </p>
                </Section>
            </div>
        </>
    );
}

Docs.layout = (page: ReactNode) => <MarketingLayout>{page}</MarketingLayout>;
