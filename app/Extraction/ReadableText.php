<?php

declare(strict_types=1);

namespace App\Extraction;

use Dom\HTMLDocument;
use fivefilters\Readability\ParseException;
use fivefilters\Readability\Readability;

/**
 * The main text of a page without navigation, ads and footers, as plain text.
 */
final class ReadableText
{
    /** What is stored per stash; the LLM later gets a much shorter excerpt. */
    public const MAX_BYTES = 100_000;

    /**
     * @param  string  $html  UTF-8, whatever its meta tags claim
     */
    public static function from(string $html): ?string
    {
        try {
            $article = new Readability()->parse(HTMLDocument::createFromString(
                $html,
                LIBXML_NOERROR,
                overrideEncoding: 'UTF-8',
            ));
        } catch (ParseException) {
            return null;
        }

        $text = $article->textContent;

        if ($text === null) {
            return null;
        }

        $text = trim(preg_replace(pattern: '/\s+/u', replacement: ' ', subject: $text) ?? $text);

        return $text === '' ? null : mb_strcut($text, start: 0, length: self::MAX_BYTES);
    }
}
