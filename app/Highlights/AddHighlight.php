<?php

declare(strict_types=1);

namespace App\Highlights;

use App\Models\Stash;
use App\Models\StashHighlight;

/**
 * Marks a passage on a stash. Marking the same passage again (same text and context) returns the highlight
 * that exists, so a client can send its request twice without making two. The caps of config/stashlist.php
 * apply to new highlights only.
 */
final class AddHighlight
{
    /**
     * @return array{StashHighlight, bool} the highlight, and whether it is new
     *
     * @throws HighlightLimitReached
     */
    public function add(Stash $stash, NewHighlight $new): array
    {
        $existing = $stash
            ->highlights()
            ->where('text', $new->text)
            ->where('prefix', $new->prefix)
            ->where('suffix', $new->suffix)
            ->first();

        if ($existing !== null) {
            return [$existing, false];
        }

        if ($stash->highlights()->count() >= config()->integer('stashlist.highlights.per_stash')) {
            throw HighlightLimitReached::forStash();
        }

        if (
            StashHighlight::query()->where('user_id', $stash->user_id)->count() >= config()->integer(
                'stashlist.highlights.per_user',
            )
        ) {
            throw HighlightLimitReached::forUser();
        }

        $highlight = new StashHighlight($new->attributes());
        $highlight->stash_id = $stash->id;
        $highlight->user_id = $stash->user_id;
        $highlight->save();

        return [$highlight, true];
    }
}
