import { CallToAction, PageHeader, Section } from '@/components/marketing';
import { Seo } from '@/components/seo';
import MarketingLayout from '@/layouts/marketing-layout';
import { docs, register } from '@/routes';
import type { ReactNode } from 'react';

type Props = {
    marketing: App.Data.MarketingData;
};

/** When the statements about the other product were last read. Change it together with the statements. */
const CHECKED = '9 October 2026';
const SOURCES = {
    site: 'https://mymind.com',
    pricing: 'https://access.mymind.com/pricing',
};

const rows: { topic: string; them: string; us: string; source: string }[] = [
    {
        topic: 'Price',
        them: 'Student of Life $7.99 a month or $79 a year; Mastermind $12.99 a month or $129 a year; The Bookmarker $4.99 a month, without AI.',
        us: '€4 a month or €40 a year with everything included. Self-hosting is free.',
        source: SOURCES.pricing,
    },
    {
        topic: 'AI',
        them: 'Organizes, summarizes and identifies links as an article, product, book or recipe. Advanced AI, summaries and PDF analysis are listed in the Mastermind plan.',
        us: 'Tags itself, finds by meaning and suggests similar stashes. One switch turns it off for your account; keyword search keeps working.',
        source: SOURCES.site,
    },
    {
        topic: 'Platforms',
        them: 'iOS, Android, a macOS app and extensions for Chrome, Edge and Safari.',
        us: 'Web, Chrome and Firefox extensions. Safari and Raycast later.',
        source: SOURCES.site,
    },
    {
        topic: 'Highlights',
        them: 'Lists saving highlights.',
        us: 'Persistent highlights, painted again when you revisit a page and the text is still there.',
        source: SOURCES.site,
    },
    {
        topic: 'Organization',
        them: 'Smart Spaces, automatic collections.',
        us: 'Tags (automatic and your own) and flat collections.',
        source: SOURCES.site,
    },
    {
        topic: 'Source',
        them: 'A hosted service.',
        us: 'AGPL-3.0, self-hostable.',
        source: SOURCES.site,
    },
];

const faq = [
    {
        question: 'How much does it cost?',
        answer: 'Hosted: €4 a month or €40 a year, everything included. Self-hosted: free.',
    },
    {
        question: 'Is my data private?',
        answer: 'Your stashes are yours: you can export everything and delete your account, and the AI features are one switch in your profile. The privacy page says what is kept and who handles it.',
    },
    {
        question: 'Can I import what I have?',
        answer: 'Pasting links, dropping images and the browser extension are the ways in today. Importers for other services are not built yet.',
    },
    {
        question: 'Can I host it myself?',
        answer: 'Yes. It is open source (AGPL-3.0) and comes with a Docker Compose file.',
    },
];

export default function Compare({ marketing }: Props) {
    return (
        <>
            <Seo
                title="A Mymind alternative"
                description="Open source, self-hostable, €4 a month, with the AI kept in the background. What is different, and who should stay where they are."
                path="/mymind-alternative"
            >
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: faq.map((item) => ({
                            '@type': 'Question',
                            name: item.question,
                            acceptedAnswer: {
                                '@type': 'Answer',
                                text: item.answer,
                            },
                        })),
                    })}
                </script>
            </Seo>

            <PageHeader title="A Mymind alternative">
                Open source, keyboard friendly, €4 a month, self-hostable, with
                the AI kept in the background.
            </PageHeader>

            <div className="grid max-w-3xl gap-10">
                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">What is different</h2>
                    <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                                <tr>
                                    <th className="p-3 font-medium"></th>
                                    <th className="p-3 font-medium">Mymind</th>
                                    <th className="p-3 font-medium">
                                        Stashlist
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr
                                        key={row.topic}
                                        className="border-b align-top last:border-0"
                                    >
                                        <th className="p-3 font-medium">
                                            {row.topic}
                                        </th>
                                        <td className="p-3 text-muted-foreground">
                                            {row.them}{' '}
                                            <a
                                                href={row.source}
                                                rel="noopener nofollow"
                                                className="underline"
                                            >
                                                source
                                            </a>
                                        </td>
                                        <td className="p-3 text-muted-foreground">
                                            {row.us}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        What is said about the other service was read on their
                        own pages on {CHECKED}, and may have changed since.
                    </p>
                </section>

                <Section title="Where Mymind is better">
                    <p>
                        Native apps for iOS, Android and macOS, a Safari
                        extension, years of polish. If you live on your phone,
                        or want those, stay where you are.
                    </p>
                </Section>

                <Section title="Who should pick which">
                    <ul className="grid list-disc gap-1 pl-5">
                        <li>Mostly on a phone, want it all in apps: Mymind.</li>
                        <li>
                            On a computer, want to own your data and maybe host
                            it: Stashlist.
                        </li>
                        <li>
                            Want the AI off: Stashlist has one switch for it.
                        </li>
                        <li>
                            Want to pay less: Stashlist, or nothing if you host
                            it.
                        </li>
                    </ul>
                </Section>

                <section className="grid gap-4">
                    <h2 className="text-lg font-medium">Questions</h2>
                    {faq.map((item) => (
                        <div key={item.question} className="grid gap-1">
                            <h3 className="text-sm font-medium">
                                {item.question}
                            </h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {item.answer}
                            </p>
                        </div>
                    ))}
                </section>

                <div className="flex flex-wrap gap-3">
                    {marketing.registration !== 'closed' && (
                        <CallToAction href={register()}>
                            Try the hosted one
                        </CallToAction>
                    )}
                    <CallToAction href={docs()} variant="outline">
                        Host it yourself
                    </CallToAction>
                </div>
            </div>
        </>
    );
}

Compare.layout = (page: ReactNode) => <MarketingLayout>{page}</MarketingLayout>;
