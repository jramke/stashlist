<?php

declare(strict_types=1);

namespace App\Ai;

use App\Tags\TagNormalizer;
use Locale;

/**
 * Puts what a model sent into the shape the rules ask for, where cleaning is kinder than asking again: no "#" in
 * a tag, no duplicates, nothing too long, nothing generic, and no more than the limits.
 */
final class AnswerCleaner
{
    /** Tags that say nothing about the content. */
    private const STOPLIST = [
        'website',
        'web site',
        'webpage',
        'web page',
        'image',
        'picture',
        'photo',
        'link',
        'page',
        'url',
    ];

    /**
     * The things seen in a picture: short names, no duplicates, no more than MAX_OBJECTS. A model that rambles
     * is cut off, not sent back: nothing here is searched as precisely as a tag.
     *
     * @return list<string>
     */
    public static function objects(mixed $proposed): array
    {
        if (! is_array($proposed)) {
            return [];
        }

        $objects = [];

        foreach (array_filter($proposed, is_string(...)) as $object) {
            $name = TagNormalizer::name($object);

            if ($name !== null && mb_strlen($name) <= EnrichmentResult::MAX_OBJECT_LENGTH) {
                $objects[TagNormalizer::slug($name)] ??= $name;
            }
        }

        return array_slice(array_values($objects), offset: 0, length: EnrichmentResult::MAX_OBJECTS);
    }

    /**
     * Tags as the model should have written them: no #, short, no duplicates, nothing from the stoplist, and
     * no more than MAX_TAGS (the first ones are the best by instruction).
     *
     * @return list<string>
     */
    public static function tags(mixed $proposed): array
    {
        if (! is_array($proposed)) {
            return [];
        }

        $tags = [];

        foreach (array_filter($proposed, is_string(...)) as $tag) {
            $name = TagNormalizer::name(str_replace(search: '#', replace: '', subject: $tag));

            if (
                $name === null ||
                mb_strlen($name) > EnrichmentResult::MAX_TAG_LENGTH ||
                in_array(TagNormalizer::slug($name), self::STOPLIST, strict: true)
            ) {
                continue;
            }

            $tags[TagNormalizer::slug($name)] ??= $name;
        }

        return array_slice(array_values($tags), offset: 0, length: EnrichmentResult::MAX_TAGS);
    }

    /**
     * Takes out the tags that only name the language the item is written in ("german", "Deutsch"): the language is
     * stored on its own, and a tag for it lands on every page in that language, so it groups nothing by topic.
     * Only the item's own language goes; "english" on a German page may well be about English.
     *
     * @param  list<string>  $tags
     * @param  string  $language  the two-letter code the model gave
     * @return list<string>
     */
    public static function withoutLanguage(array $tags, string $language): array
    {
        $names = array_map(
            static fn (string $inLanguage): string => mb_strtolower((string)Locale::getDisplayLanguage(
                $language,
                $inLanguage,
            )),
            ['en', $language],
        );

        return array_values(array_filter(
            $tags,
            static fn (string $tag): bool => ! in_array(TagNormalizer::slug($tag), $names, strict: true),
        ));
    }
}
