<?php

declare(strict_types=1);

namespace App\Ai;

use App\Enums\Subtype;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * What the model says about a stash, checked against the rules the provider's schema cannot express.
 */
final readonly class EnrichmentResult
{
    public const MAX_TAGS = 10;

    public const MAX_TAG_LENGTH = 40;

    public const MAX_SUMMARY = 400;

    public const MAX_OBJECTS = 12;

    public const MAX_OBJECT_LENGTH = 60;

    public const MAX_OCR = 5000;

    /**
     * @param  list<string>  $tags  cleaned, at most MAX_TAGS
     * @param  list<string>  $objects  what is visible in a picture, at most MAX_OBJECTS; empty for anything else
     * @param  string  $ocrText  the text visible in a picture, at most MAX_OCR characters; empty for anything else
     */
    public function __construct(
        public string $title,
        public string $summary,
        public array $tags,
        public ?Subtype $subtype,
        public string $language,
        public array $objects = [],
        public string $ocrText = '',
    ) {}

    /**
     * @param  array<string, mixed>  $data  the structured answer of the model
     * @param  int  $minTags  what is enough: three for a page, fewer for a very short note
     *
     * @throws EnrichmentInvalid
     */
    public static function from(array $data, int $minTags = 3): self
    {
        $tags = AnswerCleaner::tags($data['tags'] ?? []);
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
            objects: AnswerCleaner::objects($data['objects'] ?? []),
            ocrText: Str::limit(trim(is_string($data['ocr_text'] ?? null) ? $data['ocr_text'] : ''), self::MAX_OCR, ''),
        );
    }
}
