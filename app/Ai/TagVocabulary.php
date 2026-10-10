<?php

declare(strict_types=1);

namespace App\Ai;

use App\Models\Tag;

/**
 * The user's own tags, shown to the model so it reuses them: the most used ones and the newest. Without this,
 * every stash would invent its own wording.
 */
final class TagVocabulary
{
    /**
     * @return list<string> tag names, most used first, then the newest ones not yet listed
     */
    public function forUser(int $userId): array
    {
        $top = Tag::query()
            ->where('user_id', $userId)
            ->where('stashes_count', '>', 0)
            ->orderByDesc('stashes_count')
            ->orderBy('name')
            ->limit(config()->integer('stashlist.ai.vocabulary.top'))
            ->pluck('name', 'id');

        $recent = Tag::query()
            ->where('user_id', $userId)
            ->whereNotIn('id', $top->keys())
            ->orderByDesc('id')
            ->limit(config()->integer('stashlist.ai.vocabulary.recent'))
            ->pluck('name');

        return array_values(array_map(strval(...), [...$top->values()->all(), ...$recent->all()]));
    }
}
