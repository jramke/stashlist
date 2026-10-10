import { PageHeader } from '@/components/marketing';
import { Seo } from '@/components/seo';
import MarketingLayout from '@/layouts/marketing-layout';
import type { ReactNode } from 'react';

type Props = {
    operator: Record<
        'name' | 'address' | 'email' | 'phone' | 'vat_id' | 'register',
        string
    >;
};

export default function Imprint({ operator }: Props) {
    const rows: [string, string][] = [
        ['Operator', operator.name],
        ['Address', operator.address],
        ['Email', operator.email],
        ['Phone', operator.phone],
        ['VAT ID', operator.vat_id],
        ['Register entry', operator.register],
    ];
    const filled = rows.filter(([, value]) => value !== '');

    return (
        <>
            <Seo
                title="Imprint"
                description="Who runs this service."
                path="/imprint"
            />

            <PageHeader title="Imprint">Who runs this service.</PageHeader>

            {filled.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    The operator of this installation has not filled in their
                    details yet.
                </p>
            ) : (
                <dl className="grid max-w-xl gap-3 text-sm">
                    {filled.map(([label, value]) => (
                        <div key={label} className="grid gap-0.5">
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd className="whitespace-pre-line">{value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </>
    );
}

Imprint.layout = (page: ReactNode) => <MarketingLayout>{page}</MarketingLayout>;
