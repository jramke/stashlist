import {
    Action,
    ActionPanel,
    Color,
    Icon,
    Image,
    List,
    open,
} from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { useState } from 'react';
import { endpoint, type Stash } from './api';

const ICONS: Record<Stash['type'], Icon> = {
    link: Icon.Link,
    note: Icon.Text,
    image: Icon.Image,
    color: Icon.Droplets,
};

export default function Command() {
    const [text, setText] = useState('');
    const { url, headers } = endpoint('stashes');
    const query = new URLSearchParams({ limit: '30' });

    if (text.trim() !== '') {
        query.set('q', text.trim());
    }

    const { data, isLoading } = useFetch<{ data: Stash[] }, Stash[], Stash[]>(
        `${url}?${query.toString()}`,
        {
            headers,
            keepPreviousData: true,
            mapResult: (result) => ({ data: result.data }),
            initialData: [],
        },
    );

    return (
        <List
            isLoading={isLoading}
            throttle
            onSearchTextChange={setText}
            searchBarPlaceholder="Search your stashes"
        >
            {data.length === 0 && !isLoading ? (
                <List.EmptyView
                    title={text === '' ? 'Nothing stashed yet' : 'No match'}
                />
            ) : null}
            {data.map((stash) => (
                <List.Item
                    key={stash.id}
                    title={stash.title}
                    subtitle={stash.url === null ? undefined : host(stash.url)}
                    icon={icon(stash)}
                    accessories={stash.tags.slice(0, 3).map((tag) => ({
                        tag: { value: tag, color: Color.SecondaryText },
                    }))}
                    actions={
                        <ActionPanel>
                            <Action
                                title={
                                    stash.url === null
                                        ? 'Open in Stashlist'
                                        : 'Open Link'
                                }
                                icon={Icon.Globe}
                                onAction={() =>
                                    open(stash.url ?? stash.web_url)
                                }
                            />
                            <Action.OpenInBrowser
                                title="Open in Stashlist"
                                url={stash.web_url}
                            />
                            {stash.url !== null && (
                                <Action.CopyToClipboard
                                    title="Copy Link"
                                    content={stash.url}
                                />
                            )}
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}

function icon(stash: Stash): Image.ImageLike {
    return stash.thumbnail_url === null
        ? ICONS[stash.type]
        : { source: stash.thumbnail_url, mask: Image.Mask.RoundedRectangle };
}

function host(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}
