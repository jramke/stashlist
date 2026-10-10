import { PageHeader, Section } from '@/components/marketing';
import { Seo } from '@/components/seo';
import MarketingLayout from '@/layouts/marketing-layout';
import type { ReactNode } from 'react';

type Props = {
    operator: Record<
        'name' | 'address' | 'email' | 'phone' | 'vat_id' | 'register',
        string
    >;
};

export default function Terms({ operator }: Props) {
    return (
        <>
            <Seo
                title="Terms"
                description="The rules of using the service, in plain words."
                path="/terms"
            />

            <PageHeader title="Terms">
                The rules of using the service, in plain words.
            </PageHeader>

            <div className="grid max-w-2xl gap-8">
                <Section title="The service">
                    <p>
                        {operator.name === ''
                            ? 'The operator of this installation'
                            : operator.name}{' '}
                        runs a place to keep links, notes, images and colors,
                        and to find them again. These terms apply to using it.
                    </p>
                </Section>

                <Section title="Your account">
                    <p>
                        You are responsible for what happens under your account
                        and for keeping your password or sign-in safe. One
                        person per account. You can delete your account at any
                        time from the settings; everything in it goes with it.
                    </p>
                </Section>

                <Section title="Your content">
                    <p>
                        What you save stays yours. You give the service the
                        right to store it, read it and process it to do what you
                        ask: show it to you, make summaries and tags, search it,
                        and export it. Nothing more. Do not save what you have
                        no right to keep.
                    </p>
                </Section>

                <Section title="What you may not do">
                    <p>
                        Break the law with it; use it to attack other systems
                        (the service fetches web pages you give it, but only
                        public ones, and trying to make it reach private
                        addresses is an attack); get around the limits of your
                        plan; or load it in a way that gets in the way of
                        others. An account that does may be suspended.
                    </p>
                </Section>

                <Section title="Plans and payment">
                    <p>
                        Paid plans are charged in advance by the payment
                        provider named at checkout, monthly or yearly, and can
                        be cancelled at any time; they then run until the end of
                        the period paid for. The limits of each plan are on the
                        usage page in the settings.
                    </p>
                </Section>

                <Section title="Availability">
                    <p>
                        The service is run with care, but without a promise of
                        being up at every moment. Keep your own copy of what you
                        cannot lose: the export in the settings makes one.
                    </p>
                </Section>

                <Section title="Liability">
                    <p>
                        As far as the law allows, the operator is not liable for
                        loss that comes from using the service, except for
                        intent and gross negligence and where the law says
                        otherwise.
                    </p>
                </Section>

                <Section title="Changes and contact">
                    <p>
                        These terms may change; a change that matters is
                        announced on the changelog before it applies.
                        {operator.email !== '' && (
                            <>
                                {' '}
                                Questions:{' '}
                                <a
                                    className="underline"
                                    href={`mailto:${operator.email}`}
                                >
                                    {operator.email}
                                </a>
                                .
                            </>
                        )}
                    </p>
                </Section>
            </div>
        </>
    );
}

Terms.layout = (page: ReactNode) => <MarketingLayout>{page}</MarketingLayout>;
