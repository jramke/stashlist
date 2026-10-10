<?php

declare(strict_types=1);

namespace App\Ai;

use App\Enums\Subtype;
use App\Tags\TagNormalizer;
use Illuminate\Support\Facades\Validator;

/**
 * What the model says about a stash, checked against the rules the provider's schema cannot express.
 */
final readonly class EnrichmentResult
{
    public const MAX_TAGS = 10;

    public const MAX_TAG_LENGTH = 40;

    public const MAX_SUMMARY = 400;

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
     * @param  list<string>  $tags  cleaned, at most MAX_TAGS
     */
    public function __construct(
        public string $title,
        public string $summary,
        public array $tags,
        public ?Subtype $subtype,
        public string $language,
    ) {}

    /**
     * @param  array<string, mixed>  $data  the structured answer of the model
     * @param  int  $minTags  what is enough: three for a page, fewer for a very short note
     *
     * @throws EnrichmentInvalid
     */
    public static function from(array $data, int $minTags = 3): self
    {
        $tags = self::cleanTags($data['tags'] ?? []);
        $data['tags'] = $tags;
        $data['language'] = is_string($data['language'] ?? null) ? mb_strtolower(trim($data['language'])) : null;

        $validator = Validator::make(
            $data,
            [
                'title' => ['nullable', 'string', 'max:200'],
                'summary' => ['required', 'string', 'max:'.self::MAX_SUMMARY],
                'tags' => ['required', 'array', 'min:'.$minTags],
                'subtype' => ['required', 'string', 'in:'.implode(',', Subtype::values())],
                'language' => ['required', 'string', 'regex:/^[a-z]{2}$/'],
            ],
            [
                'summary.max' => 'The summary must be at most '.self::MAX_SUMMARY.' characters.',
                'summary.required' => 'The summary is empty.',
                'tags.min' => "Give at least {$minTags} tags, each a short phrase that names a topic.",
                'language.regex' => 'The language must be a two-letter ISO 639-1 code such as "en" or "de".',
                'subtype.in' => 'The subtype must be one of: '.implode(', ', Subtype::values()).'.',
            ],
        );

        if ($validator->fails()) {
            throw new EnrichmentInvalid(array_values(array_unique($validator->errors()->all())));
        }

        return new self(
            title: trim((string)($data['title'] ?? '')),
            summary: trim((string)$data['summary']),
            tags: $tags,
            subtype: Subtype::from((string)$data['subtype']),
            language: (string)$data['language'],
        );
    }

    /**
     * Tags as the model should have written them: no #, short, no duplicates, nothing from the stoplist, and
     * no more than MAX_TAGS (the first ones are the best by instruction).
     *
     * @return list<string>
     */
    private static function cleanTags(mixed $proposed): array
    {
        if (! is_array($proposed)) {
            return [];
        }

        $tags = [];

        foreach (array_filter($proposed, is_string(...)) as $tag) {
            $name = TagNormalizer::name(str_replace(search: '#', replace: '', subject: $tag));

            if (
                $name === null ||
                mb_strlen($name) > self::MAX_TAG_LENGTH ||
                in_array(TagNormalizer::slug($name), self::STOPLIST, strict: true)
            ) {
                continue;
            }

            $tags[TagNormalizer::slug($name)] ??= $name;
        }

        return array_slice(array_values($tags), offset: 0, length: self::MAX_TAGS);
    }
}
