<?php

declare(strict_types=1);

namespace App\Tags;

use App\Models\Tag;

/**
 * Finds the tag a user already has for a proposed name, so "Sourdough Starters" lands on "sourdough starter"
 * and not on a near-duplicate: the same name, then the same name in plural or singular, then a name that is at
 * least 90% alike (one letter off in a longer word). Short names must match exactly, because three-letter
 * words are 66% alike for a single letter.
 */
final class TagMatcher
{
    private const SIMILARITY = 90.0;

    private const MIN_LENGTH_FOR_SIMILARITY = 5;

    /**
     * @param  iterable<Tag>  $existing  the user's tags
     */
    public function match(string $name, iterable $existing): ?Tag
    {
        $slug = TagNormalizer::slug($name);
        $singular = self::singular($slug);
        $similar = null;

        foreach ($existing as $tag) {
            if ($tag->slug === $slug) {
                return $tag;
            }

            if (self::singular($tag->slug) === $singular) {
                $similar ??= $tag;
            }
        }

        if ($similar !== null) {
            return $similar;
        }

        return mb_strlen($slug) < self::MIN_LENGTH_FOR_SIMILARITY ? null : $this->closest($slug, $existing);
    }

    /**
     * @param  iterable<Tag>  $existing
     */
    private function closest(string $slug, iterable $existing): ?Tag
    {
        $best = null;
        $bestPercent = self::SIMILARITY;

        foreach ($existing as $tag) {
            if (
                mb_strlen($tag->slug) < self::MIN_LENGTH_FOR_SIMILARITY ||
                abs(mb_strlen($tag->slug) - mb_strlen($slug)) > 2
            ) {
                continue;
            }

            $percent = (similar_text($slug, $tag->slug) * 2 * 100) / (strlen($slug) + strlen($tag->slug));

            if ($percent >= $bestPercent) {
                $best = $tag;
                $bestPercent = $percent;
            }
        }

        return $best;
    }

    /**
     * The last word without a plural ending: "starters" and "starter", "libraries" and "library".
     */
    private static function singular(string $slug): string
    {
        $words = explode(separator: ' ', string: $slug);
        $last = array_pop($words);

        $last = match (true) {
            mb_strlen($last) > 4 && str_ends_with($last, 'ies') => mb_substr($last, start: 0, length: -3).'y',
            mb_strlen($last) > 4 && str_ends_with($last, 'ses') => mb_substr($last, start: 0, length: -2),
            mb_strlen($last) > 3 && str_ends_with($last, 's') && ! str_ends_with($last, 'ss') => mb_substr(
                $last,
                start: 0,
                length: -1,
            ),
            default => $last,
        };

        return implode(separator: ' ', array: [...$words, $last]);
    }
}
