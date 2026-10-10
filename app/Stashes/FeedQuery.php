<?php

declare(strict_types=1);

namespace App\Stashes;

use App\Data\FeedFiltersData;
use App\Models\Stash;
use Illuminate\Database\Eloquent\Builder;

/**
 * The feed without a search query: the user's stashes, newest first, narrowed by the filters. It touches the
 * search engine never; ordering and keyset pagination use the (user_id, created_at, id) index.
 */
final class FeedQuery
{
    /** What a card needs, so rendering a page costs a fixed number of queries. */
    public const EAGER = [
        'enrichment:stash_id,user_id,title,description,summary,colors,extracted_at',
        'thumbnail',
        'visibleTags',
    ];

    /**
     * @return Builder<Stash>
     */
    public function build(FeedFiltersData $filters): Builder
    {
        $query = Stash::query()->with(self::EAGER)->orderByDesc('created_at')->orderByDesc('id');

        if ($filters->type !== null) {
            $query->where('type', $filters->type->value);
        }

        if ($filters->status !== null) {
            $query->where('ai_status', $filters->status->value);
        }

        foreach ($filters->tags as $tagId) {
            $query->whereHas('visibleTags', static fn (Builder $tags) => $tags->where('tags.id', $tagId));
        }

        return $this->inCollection($query, $filters->collection);
    }

    /**
     * @param  Builder<Stash>  $query
     * @return Builder<Stash>
     */
    private function inCollection(Builder $query, ?string $collection): Builder
    {
        return match ($collection) {
            null => $query,
            'none' => $query->whereDoesntHave('collections'),
            default => $query->whereHas('collections', static fn (Builder $c) => $c->where(
                'collections.id',
                (int)$collection,
            )),
        };
    }
}
