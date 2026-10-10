import { PageHeader, Section } from '@/components/marketing';
import { Seo } from '@/components/seo';
import MarketingLayout from '@/layouts/marketing-layout';
import type { ReactNode } from 'react';

type Props = {
    privacy: App.Data.PrivacyData;
};

/**
 * What this installation keeps about you, who else sees it, and how to take it back. It describes what the software
 * does; the operator's name and address come from the settings of the installation.
 */
export default function Privacy({ privacy }: Props) {
    const operator = [privacy.operator_name, privacy.operator_address]
        .filter((part) => part !== '')
        .join(', ');

    return (
        <>
            <Seo
                title="Privacy"
                description="What this service keeps about you, who else handles it, how long, and how you take it back."
                path="/privacy"
            />

            <PageHeader title="Privacy">
                Stashlist keeps what you save for you. This page says what that
                is, who else handles it, and how you take it back.
            </PageHeader>

            <div className="grid max-w-2xl gap-8">
                <Section title="Who is responsible">
                    <p>
                        {operator === ''
                            ? 'The operator of this installation has not filled in their details yet.'
                            : operator}
                        {privacy.operator_email !== '' && (
                            <>
                                {' '}
                                Contact:{' '}
                                <a
                                    className="underline"
                                    href={`mailto:${privacy.operator_email}`}
                                >
                                    {privacy.operator_email}
                                </a>
                                .
                            </>
                        )}
                    </p>
                </Section>

                <Section title="What is kept">
                    <p>
                        Your account: name, email address and either a password
                        (stored only as a hash) or the identity of the account
                        you sign in with.
                    </p>
                    <p>
                        What you save: links, notes, images and colors, with
                        their tags, collections and highlights; for a link also
                        the title, description, picture and the readable text of
                        the page, read when you saved it. When you use the
                        browser extension, the page is read in your browser and
                        sent to your account on your action only; the extension
                        keeps a copy of your highlights in the browser to show
                        them on pages, and never sends which pages you visit.
                    </p>
                    <p>
                        What the machine adds: a summary, tags, a description of
                        pictures and the text found in them, and a numeric
                        fingerprint of each stash that makes search by meaning
                        possible. You can see and change the summary and tags.
                    </p>
                    <p>
                        Technical records: the web server and the application
                        log requests and errors for operating the service. A
                        session cookie keeps you signed in and a second one
                        protects forms; your light or dark choice is stored in
                        your browser. There is no advertising and no tracking
                        across sites.
                    </p>
                </Section>

                <Section title="Who else handles it">
                    <p>
                        These services process data on behalf of the operator:
                    </p>
                    <ul className="list-disc pl-5">
                        <li>
                            The hosting provider of the servers
                            {privacy.object_storage
                                ? ' and of the object storage where your images and exports are kept'
                                : ''}
                            . They store your data and cannot use it for their
                            own purposes.
                        </li>
                        {privacy.ai && (
                            <li>
                                {privacy.ai_provider}, the AI provider, only
                                while smart features are on for your account:
                                the title, address, text and pictures of what
                                you save are sent to it to write the summary and
                                tags and to make the fingerprint, and the words
                                you search for are sent to it to search by
                                meaning. Turn smart features off in{' '}
                                <em>Settings, Profile</em> and nothing more is
                                sent; what was made before stays until you
                                delete it.
                            </li>
                        )}
                        {privacy.sign_in.length > 0 && (
                            <li>
                                {privacy.sign_in.join(' and ')}, if you sign in
                                with them: they tell us your name and verified
                                email address when you sign in.
                            </li>
                        )}
                    </ul>
                    <p>
                        Nothing is sold, and nothing is shared for advertising.
                    </p>
                </Section>

                <Section title="How long it is kept">
                    <p>
                        As long as your account exists. A stash you delete is
                        removed after a few seconds (you can undo until then).
                        When you delete your account, everything of yours is
                        removed from the application, the search index and the
                        file storage within minutes. Backups of the database are
                        kept for up to 14 days and then rotate away. An export
                        you make is kept for a week.
                    </p>
                </Section>

                <Section title="Your rights">
                    <p>
                        You can take a copy of everything with{' '}
                        <em>Settings, Export</em>, correct your account in{' '}
                        <em>Settings, Profile</em>, and delete it there too. For
                        anything else, write to the contact above.
                    </p>
                </Section>
            </div>
        </>
    );
}

Privacy.layout = (page: ReactNode) => <MarketingLayout>{page}</MarketingLayout>;
