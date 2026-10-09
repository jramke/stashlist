<?php

declare(strict_types=1);

namespace App\Tags;

use App\Enums\TagSource;
use App\Models\Stash;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Relations\Pivot;
use InvalidArgumentException;

/**
 * The only writer of the stash_tag rows and of tags.stashes_count (an arch test keeps it that way).
 *
 * A row's source says who put the tag there, and the rules protect the user's decisions: a user tag is
 * never touched by the machine, and an AI tag the user removed stays as a tombstone (dismissed_at) so the
 * next AI run does not bring it back.
 */
final class TagSync
{
    /**
     * Adds a tag by name, creating it when this user has not used it yet. An AI tag the user adds themselves
     * becomes a user tag, even when it was dismissed before.
     *
     * @throws InvalidArgumentException when the name is empty after normalization
     */
    public function addByUser(Stash $stash, string $name): Tag
    {
        $display = TagNormalizer::name($name) ?? throw new InvalidArgumentException('A tag needs a name.');
        $tag = $this->findOrCreate($stash->user_id, $display);

        $this->linkAsUser($stash, $tag, $stash->tags()->where('tags.id', $tag->id)->first()?->pivot);

        $this->recount($tag);

        return $tag->refresh();
    }

    /**
     * Removes a tag the user does not want on this stash. A user tag is deleted; an AI tag is kept as a
     * dismissed tombstone.
     */
    public function removeByUser(Stash $stash, Tag $tag): void
    {
        $row = $stash->tags()->where('tags.id', $tag->id)->first()?->pivot;

        if ($row === null) {
            return;
        }

        if ($row->getAttribute('source') === TagSource::User->value) {
            $stash->tags()->detach($tag->id);
            $this->recount($tag);

            return;
        }

        $stash->tags()->updateExistingPivot($tag->id, ['dismissed_at' => now()]);
        $this->recount($tag);
    }

    /**
     * Links the tag as a user tag: new link, or an AI link (visible or dismissed) taken over by the user.
     */
    private function linkAsUser(Stash $stash, Tag $tag, ?Pivot $row): void
    {
        if ($row === null) {
            $stash->tags()->attach($tag->id, [
                'user_id' => $stash->user_id,
                'source' => TagSource::User->value,
                'created_at' => now(),
            ]);

            return;
        }

        if ($row->getAttribute('source') !== TagSource::User->value) {
            $stash->tags()->updateExistingPivot($tag->id, ['source' => TagSource::User->value, 'dismissed_at' => null]);
        }
    }

    private function findOrCreate(int $userId, string $name): Tag
    {
        $slug = TagNormalizer::slug($name);
        $existing = Tag::query()->where('user_id', $userId)->where('slug', $slug)->first();

        if ($existing !== null) {
            return $existing;
        }

        // Two requests may create the same tag at once; createOrFirst falls back to the row that won.
        return Tag::unguarded(
            static fn (): Tag => Tag::query()->createOrFirst(['user_id' => $userId, 'slug' => $slug], [
                'name' => $name,
            ]),
        );
    }

    /**
     * Recomputes the counters of tags whose links changed without TagSync, for example when a stash was deleted.
     *
     * @param  array<int, int>  $tagIds
     */
    public function recountTags(int $userId, array $tagIds): void
    {
        foreach (Tag::query()->where('user_id', $userId)->whereIn('id', $tagIds)->get() as $tag) {
            $this->recount($tag);
        }
    }

    /**
     * stashes_count is the number of stashes where the tag is visible (not dismissed). It is recomputed from
     * the rows, so it cannot drift.
     */
    private function recount(Tag $tag): void
    {
        $visible = $tag->stashes()->wherePivotNull('dismissed_at')->count();

        Tag::query()->whereKey($tag->id)->update(['stashes_count' => $visible]);
    }
}
