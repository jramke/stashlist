import { SearchBox } from '@/components/search-box';
import { feedUrl } from '@/lib/feed-url';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';

type StashType = App.Enums.StashType;

const types: { value: StashType | null; label: string }[] = [
    { value: null, label: 'All' },
    { value: 'link', label: 'Links' },
    { value: 'note', label: 'Notes' },
    { value: 'image', label: 'Images' },
    { value: 'color', label: 'Colors' },
];

type Filters = App.Data.FeedFiltersData;

function Chip({
    href,
    active,
    children,
}: {
    href: string;
    active: boolean;
    children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            preserveScroll
            aria-pressed={active}
            className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors hover:bg-muted',
                active &&
                    'border-foreground bg-foreground text-background hover:bg-foreground/90',
            )}
        >
            {children}
        </Link>
    );
}

/** Search and narrow the feed by type, failure and tags. Every chip is a plain link, so the URL says what you see. */
export function FeedFilters({
    filters,
    tags,
}: {
    filters: Filters;
    tags: App.Data.TagData[];
}) {
    return (
        <div className="grid gap-3">
            <SearchBox filters={filters} />

            <div className="flex flex-wrap items-center gap-2">
                {types.map(({ value, label }) => (
                    <Chip
                        key={label}
                        href={feedUrl(filters, { type: value })}
                        active={filters.type === value}
                    >
                        {label}
                    </Chip>
                ))}
                {filters.q === null && (
                    <Chip
                        href={feedUrl(filters, {
                            status:
                                filters.status === 'failed' ? null : 'failed',
                        })}
                        active={filters.status === 'failed'}
                    >
                        Failed
                    </Chip>
                )}
            </div>

            {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {tags.map((tag) => {
                        const active = filters.tags.includes(tag.id);

                        return (
                            <Chip
                                key={tag.id}
                                href={feedUrl(filters, {
                                    tags: active
                                        ? filters.tags.filter(
                                              (id) => id !== tag.id,
                                          )
                                        : [...filters.tags, tag.id],
                                })}
                                active={active}
                            >
                                {tag.name}
                            </Chip>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
