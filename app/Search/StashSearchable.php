<?php

declare(strict_types=1);

namespace App\Search;

use App\Models\Stash;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Str;
use Laravel\Scout\Searchable;

/**
 * How a stash goes into the search index. The index is a projection: Meilisearch only gets ids and search text,
 * and the stash is read back from the database.
 *
 * @require-extends Stash
 */
trait StashSearchable
{
    // The methods below replace those of Scout's trait. #[\Override] cannot mark them: PHP only checks parent classes.
    use Searchable;

    /** Relations the search document is built from; load them before indexing. */
    public const SEARCH_RELATIONS = ['enrichment', 'visibleTags', 'collections'];

    /**
     * Private stashes are indexed too; the search is always limited to the owner. Build the document from a
     * stash with SEARCH_RELATIONS loaded.
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        $enrichment = $this->enrichment;
        $tags = $this->visibleTags;

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'type' => $this->type->value,
            'subtype' => $this->subtype,
            'is_private' => $this->is_private,
            'title' => $this->title ?? $enrichment->title ?? $this->domain,
            'url' => $this->url,
            'domain' => $this->domain,
            'body' => Str::limit((string)$this->body, 20_000, ''),
            'summary' => $enrichment->summary ?? null,
            'content' => Str::limit($enrichment->extracted_text ?? '', 20_000, ''),
            'ocr_text' => $enrichment->ocr_text ?? null,
            'objects' => $enrichment->objects ?? [],
            'tags' => $tags->pluck('name')->values()->all(),
            'tag_ids' => $tags->pluck('id')->values()->all(),
            'collection_ids' => $this->collections->pluck('id')->values()->all(),
            'language' => $enrichment->language ?? null,
            'created_at' => $this->created_at?->timestamp,
            'updated_at' => $this->updated_at?->timestamp,
        ];
    }

    /**
     * Scout calls this with the models it is about to index, in the indexing job: load what the documents need
     * for all of them at once.
     *
     * @param  SupportCollection<int, Stash>  $models
     * @return SupportCollection<int, Stash>
     */
    public function makeSearchableUsing(SupportCollection $models): SupportCollection
    {
        if ($models instanceof EloquentCollection) {
            $models->load(self::SEARCH_RELATIONS);
        }

        return $models;
    }

    /**
     * Queues these stashes for indexing. For changes the model observer cannot see, such as links to tags and
     * collections, which live in pivot tables; the queued job reads the stash again when it runs.
     *
     * @param  list<int>  $ids
     */
    public static function reindex(array $ids): void
    {
        if ($ids !== []) {
            // @mago-expect analysis:non-documented-method
            static::query()->whereKey($ids)->searchable();
        }
    }

    /**
     * A save only reindexes when a searchable column changed; flipping ai_status or touching indexed_at would
     * otherwise reindex on every pipeline step. The insert itself has no recorded changes, and the instance
     * keeps wasRecentlyCreated for the rest of its life, so that flag only counts while no update happened yet.
     */
    public function searchIndexShouldBeUpdated(): bool
    {
        return (
            $this->wasRecentlyCreated &&
            $this->getChanges() === [] ||
            $this->wasChanged(['type', 'subtype', 'title', 'body', 'url', 'domain', 'is_private'])
        );
    }
}
