<?php

declare(strict_types=1);

namespace App\Import;

use App\Enums\StashType;
use App\Support\InputClassifier;
use App\Support\UrlNormalizer;
use App\Support\UrlParts;
use Carbon\CarbonImmutable;
use DateTimeImmutable;
use DateTimeZone;

/**
 * The mapping from the old app's saves to stashes (plan M1):
 *
 *   website -> link   (url; title and description were scraped; favicon kept in meta)
 *   text    -> note   (text is the body)
 *   image   -> image  (image_url is the source; description is the caption, the stash body)
 *   color   -> color  (the old app kept the value in `title`)
 *
 * Nothing here touches the network: extraction fetches every link and image again once the stash exists.
 */
final readonly class OldSaveMapper
{
    public function __construct(
        private InputClassifier $classifier,
    ) {}

    /**
     * @throws SaveSkipped
     */
    public function map(OldSave $save): MappedSave
    {
        $createdAt = $this->createdAt($save);

        return match ($save->type) {
            'website' => $this->link($save, $createdAt),
            'text' => $this->note($save, $createdAt),
            'image' => $this->image($save, $createdAt),
            'color' => $this->color($save, $createdAt),
            default => throw new SaveSkipped('unknown type'),
        };
    }

    private function link(OldSave $save, CarbonImmutable $createdAt): MappedSave
    {
        [$url, $hash, $domain] = $this->webUrl($save->url);

        return new MappedSave(
            type: StashType::Link,
            importId: $save->id,
            createdAt: $createdAt,
            title: $this->blankToNull($save->title),
            url: $url,
            urlHash: $hash,
            domain: $domain,
            description: $this->blankToNull($save->description),
            faviconUrl: $this->blankToNull($save->faviconUrl),
        );
    }

    private function note(OldSave $save, CarbonImmutable $createdAt): MappedSave
    {
        $text = $this->blankToNull($save->text) ?? throw new SaveSkipped('empty text');

        return new MappedSave(
            type: StashType::Note,
            importId: $save->id,
            createdAt: $createdAt,
            title: $this->blankToNull($save->title),
            body: $text,
        );
    }

    private function image(OldSave $save, CarbonImmutable $createdAt): MappedSave
    {
        [$url, $hash, $domain] = $this->webUrl($save->imageUrl);

        return new MappedSave(
            type: StashType::Image,
            importId: $save->id,
            createdAt: $createdAt,
            title: $this->blankToNull($save->title),
            body: $this->blankToNull($save->description),
            url: $url,
            urlHash: $hash,
            domain: $domain,
        );
    }

    private function color(OldSave $save, CarbonImmutable $createdAt): MappedSave
    {
        $classified = $this->classifier->classify($save->title);

        if ($classified->type !== StashType::Color) {
            throw new SaveSkipped('not a color');
        }

        return new MappedSave(
            type: StashType::Color,
            importId: $save->id,
            createdAt: $createdAt,
            title: $this->blankToNull($save->description),
            body: $classified->value,
        );
    }

    /**
     * @return array{string, string, ?string} the URL as saved, its dedupe hash and its domain
     *
     * @throws SaveSkipped
     */
    private function webUrl(string $url): array
    {
        $url = trim($url);
        $normalized = UrlNormalizer::normalize($url);

        if ($normalized === null) {
            throw new SaveSkipped($url === '' ? 'no url' : 'not a web url');
        }

        $host = UrlParts::parse($normalized)?->host;

        return [
            $url,
            UrlNormalizer::hash($normalized),
            $host === null ? null : preg_replace(pattern: '/^www\./', replacement: '', subject: $host),
        ];
    }

    /**
     * The old app wrote the time as JavaScript's toISOString(), or as SQLite's "YYYY-MM-DD HH:MM:SS" when the
     * column default applied. Both are UTC. PHP's own parser takes almost any text as a date, so only these two
     * shapes are accepted.
     *
     * @throws SaveSkipped
     */
    private function createdAt(OldSave $save): CarbonImmutable
    {
        foreach (['Y-m-d\TH:i:s.v\Z', 'Y-m-d H:i:s'] as $format) {
            $parsed = DateTimeImmutable::createFromFormat($format, $save->createdAt, new DateTimeZone('UTC'));

            // createFromFormat rolls an impossible date over (month 13) instead of failing.
            if ($parsed !== false && $parsed->format($format) === $save->createdAt) {
                return CarbonImmutable::instance($parsed);
            }
        }

        throw new SaveSkipped('no valid date');
    }

    private function blankToNull(string $value): ?string
    {
        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
