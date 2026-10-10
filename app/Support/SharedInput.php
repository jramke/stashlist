<?php

declare(strict_types=1);

namespace App\Support;

/**
 * What the share sheet of a phone hands over (title, text, url) turned into the one string the capture box
 * takes. Android apps often put the link in the text, next to a sentence, so a link found anywhere wins.
 */
final class SharedInput
{
    public static function from(?string $title, ?string $text, ?string $url): ?string
    {
        foreach ([$url, $text, $title] as $part) {
            if ($part !== null && preg_match('~https?://\S+~i', $part, $match) === 1) {
                return $match[0];
            }
        }

        foreach ([$text, $title] as $part) {
            $part = trim((string)$part);

            if ($part !== '') {
                return $part;
            }
        }

        return null;
    }
}
