<?php

declare(strict_types=1);

namespace App\Ai;

use App\Tags\TagNormalizer;

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
}
