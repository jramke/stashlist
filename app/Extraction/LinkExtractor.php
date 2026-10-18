<?php

declare(strict_types=1);

namespace App\Extraction;

use App\Enums\FileRole;
use App\Enums\StashType;
use App\Images\InvalidImage;
use App\Models\Stash;

/**
 * Extraction for a stash that is a link: fetch the URL once, then either keep an image the URL turned out to
 * serve, or read the page and copy its Open Graph image.
 */
final readonly class LinkExtractor
{
    private const PAGE_LIMIT = 3 * 1024 * 1024;

    private const IMAGE_LIMIT = 10 * 1024 * 1024;

    public function __construct(
        private SafeHttp $http,
        private PageParser $parser,
        private ImageExtractor $images,
    ) {}

    /**
     * @param  string|null  $previousHash  the extract_hash of the last run; the same hash means nothing changed
     * @return ExtractionResult|null null when the fetched content is unchanged
     *
     * @throws BlockedUrl
     * @throws FetchFailed
     * @throws InvalidImage
     */
    public function extract(Stash $stash, ?string $previousHash): ?ExtractionResult
    {
        try {
            $response = $this->http->get((string)$stash->url, [
                'text/html' => self::PAGE_LIMIT,
                'application/xhtml+xml' => self::PAGE_LIMIT,
                'image/*' => self::IMAGE_LIMIT,
            ]);
        } catch (FetchFailed $failure) {
            return $this->otherThing($stash, $failure) ?? throw $failure;
        }

        $hash = hash(algo: 'sha256', data: $response->body);

        if ($hash === $previousHash) {
            return null;
        }

        if (str_starts_with($response->contentType, 'image/')) {
            $image = $this->images->derive($stash, $response->body, keepAs: FileRole::Original);

            return new ExtractionResult(
                hash: $hash,
                type: StashType::Image,
                meta: $image->meta,
                colors: $image->colors,
            );
        }

        return $this->page($stash, $response, $hash);
    }

    private function page(Stash $stash, FetchedResponse $response, string $hash): ExtractionResult
    {
        $page = $this->parser->parse($response);
        $image = $page->imageUrl === null || ClientPicture::isKept($stash)
            ? null
            : $this->openGraphImage($stash, $page->imageUrl);

        return new ExtractionResult(
            hash: $hash,
            subtype: Subtypes::of($stash->domain, $page->openGraphType, $page->schemaTypes),
            meta: array_filter([
                'site_name' => $page->siteName,
                'favicon_url' => $page->faviconUrl,
                'icon_urls' => $page->iconUrls,
                'lang' => $page->language,
                'price' => $page->price?->toArray(),
            ]),
            title: $page->title,
            description: $page->description,
            text: $page->text,
            colors: $image?->colors,
        );
    }

    /**
     * A link to something that is not a page or a picture (a PDF, a spreadsheet, a video file) is worth keeping as
     * it is: a video file is a video, anything else a file named as its address names it. Nothing failed. A
     * response that does not say what it is stays a failure.
     */
    private function otherThing(Stash $stash, FetchFailed $failure): ?ExtractionResult
    {
        $type = $failure->mediaType;

        if ($failure->reason !== 'unsupported_type' || $type === null || $type === 'unknown') {
            return null;
        }

        $hash = hash(algo: 'sha256', data: (string)$stash->url.$type);

        if (str_starts_with($type, 'video/')) {
            return new ExtractionResult(hash: $hash, subtype: 'video', meta: ['mime' => $type]);
        }

        $name = basename((string)parse_url((string)$stash->url, PHP_URL_PATH));

        return new ExtractionResult(
            hash: $hash,
            type: StashType::File,
            meta: ['mime' => $type],
            title: $name === '' ? null : mb_substr(rawurldecode($name), start: 0, length: 200),
        );
    }

    /**
     * The page's Open Graph image is a nice-to-have: when it cannot be fetched or read, the stash simply has
     * no thumbnail.
     */
    private function openGraphImage(Stash $stash, string $url): ?DerivedImage
    {
        try {
            $response = $this->http->get($url, ['image/*' => self::IMAGE_LIMIT]);

            return $this->images->derive($stash, $response->body, keepAs: FileRole::Og);
        } catch (BlockedUrl|FetchFailed|InvalidImage) {
            return null;
        }
    }
}
