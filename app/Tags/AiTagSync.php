<?php

declare(strict_types=1);

namespace App\Tags;

use App\Enums\TagSource;
use App\Models\Stash;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Sets the automatic tags of a stash from a model's proposal. Names are matched to the user's existing tags
 * first, so the vocabulary does not drift; only what is left becomes a new tag.
 *
 * The user's decisions win: a tag the user put on stays theirs, and an automatic tag the user removed stays
 * removed (the tombstone). Automatic tags of an earlier run that are not proposed now are taken off. Nothing
 * here reindexes: the pipeline's last stage does.
 *
 * Like TagSync, a writer of stash_tag rows (the architecture test allows the whole Tags namespace).
 */
final class AiTagSync
{
    public function __construct(
        private readonly TagSync $tags,
        private readonly TagMatcher $matcher,
    ) {}

    /**
     * @param  list<string>  $names
     */
    public function apply(Stash $stash, array $names): void
    {
        $existing = Tag::query()->where('user_id', $stash->user_id)->get();
        $linked = $this->linkedTags($stash);
        $proposed = [];

        foreach ($names as $name) {
            $display = TagNormalizer::name($name);

            if ($display === null) {
                continue;
            }

            $tag = $this->matcher->match($display, $existing) ?? $this->tags->findOrCreate($stash->user_id, $display);
            $existing->push($tag);
            $proposed[$tag->id] = $tag;
        }

        foreach ($proposed as $tagId => $tag) {
            if (array_key_exists($tagId, $linked)) {
                continue;
            }

            $stash->tags()->attach($tag->id, [
                'user_id' => $stash->user_id,
                'source' => TagSource::Ai->value,
                'created_at' => now(),
            ]);
        }

        // Automatic tags of an earlier run, still visible, that this run did not propose.
        $stale = array_keys(array_filter(
            $linked,
            static fn (array $row): bool => $row['source'] === TagSource::Ai->value && ! $row['dismissed'],
        ));
        $stale = array_values(array_diff($stale, array_keys($proposed)));

        if ($stale !== []) {
            $stash->tags()->detach($stale);
        }

        $this->tags->recountTags($stash->user_id, [...array_keys($proposed), ...$stale]);
    }

    /**
     * @return array<int, array{source: string, dismissed: bool}> the tag rows of the stash, dismissed ones too
     */
    private function linkedTags(Stash $stash): array
    {
        $linked = [];

        foreach ($stash->tags()->get() as $tag) {
            /** @var Pivot $pivot */
            $pivot = $tag->getRelation('pivot');
            $linked[$tag->id] = [
                'source' => (string)$pivot->getAttribute('source'),
                'dismissed' => $pivot->getAttribute('dismissed_at') !== null,
            ];
        }

        return $linked;
    }
}
