<?php

declare(strict_types=1);

namespace App\Actions\Stashes;

use App\Enums\FileRole;
use App\Images\ImageProcessor;
use App\Images\InvalidImage;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Storage\Blob;
use App\Storage\StashStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

/**
 * Records what a client read from the page it has open (plan 6.3): the text, the description and the facts for
 * the meta column go in at once, and the picture bytes it sent are stored, so the server needs neither the
 * page nor the image behind a login to be reachable.
 */
final readonly class ApplyCapturedPage
{
    /** Same cap as the text the server extracts itself. */
    private const TEXT_LIMIT = 100_000;

    public function __construct(
        private StashStorage $storage,
        private ImageProcessor $images,
    ) {}

    /**
     * @param  UploadedFile|null  $image  the page's own picture, for example its Open Graph image
     * @param  UploadedFile|null  $screenshot  what the client saw, used when there is no picture
     *
     * @throws InvalidImage when a file is not an image we accept
     */
    public function apply(Stash $stash, CapturedPage $page, ?UploadedFile $image, ?UploadedFile $screenshot): void
    {
        $this->storeFile($stash, FileRole::Og, $image);
        $this->storeFile($stash, FileRole::Screenshot, $screenshot);

        $stash
            ->forceFill([
                'meta' => [...($stash->meta ?? []), ...$this->meta($page, $image)],
            ])
            ->save();

        if ($page->hasContent()) {
            $this->enrichment($stash, $page);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function meta(CapturedPage $page, ?UploadedFile $image): array
    {
        return array_filter(
            [
                'site_name' => $page->siteName,
                'favicon_url' => $page->faviconUrl,
                'lang' => $page->language,
                'author' => $page->author,
                'published' => $page->published,
                'image_url' => $page->imageUrl,
                // The picture the client sent wins over any the server could fetch.
                'client_picture' => $image === null ? null : true,
                'schema_org' => $page->schemaOrg === [] ? null : $page->schemaOrg,
                'captured_by' => array_filter(['source' => $page->source, 'version' => $page->version]),
            ],
            static fn (mixed $value): bool => $value !== null && $value !== [],
        );
    }

    private function enrichment(Stash $stash, CapturedPage $page): void
    {
        $text = Str::limit((string)$page->contentMarkdown, self::TEXT_LIMIT, end: '');

        StashEnrichment::query()->updateOrCreate(
            ['stash_id' => $stash->id],
            [
                'user_id' => $stash->user_id,
                'description' => $page->description === null ? null : Str::limit($page->description, 1000, end: ''),
                'extracted_text' => $text,
                'language' => $page->language === null ? null : substr($page->language, offset: 0, length: 2),
                'extract_hash' => hash(algo: 'sha256', data: $text),
                'extracted_at' => now(),
            ],
        );
    }

    /**
     * @throws InvalidImage
     */
    private function storeFile(Stash $stash, FileRole $role, ?UploadedFile $file): void
    {
        $bytes = $file?->get();

        if ($bytes === null || $bytes === false) {
            return;
        }

        $this->storage->store($stash, $role, new Blob($bytes, $this->images->mime($bytes)));
    }
}
