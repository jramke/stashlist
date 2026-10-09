<?php

declare(strict_types=1);

namespace App\Actions\Stashes;

use App\Enums\StashType;
use App\Images\ImageProcessor;
use App\Images\InvalidImage;
use App\Support\ClassifiedInput;
use App\Support\InputClassifier;
use App\Support\UrlNormalizer;
use App\Support\UrlParts;
use Illuminate\Http\UploadedFile;
use InvalidArgumentException;

/**
 * Looks at a capture request and decides what is being saved: an uploaded image, a link (with its dedupe
 * hash and domain), an image URL, a color or a note.
 */
final readonly class StashDraftFactory
{
    public function __construct(
        private InputClassifier $classifier,
        private ImageProcessor $images,
    ) {}

    /**
     * @throws InvalidArgumentException when there is nothing to save
     * @throws InvalidImage when an upload is not an image we accept
     */
    public function fromPayload(CapturePayload $payload): StashDraft
    {
        if ($payload->image !== null) {
            return $this->fromUpload($payload->image);
        }

        $classified = $this->classifier->classify($payload->input ?? '');

        if ($classified->type === StashType::Note && $classified->value === '') {
            throw new InvalidArgumentException('There is nothing to capture.');
        }

        return match ($classified->type) {
            StashType::Link, StashType::Image => $this->fromUrl($classified),
            default => new StashDraft(type: $classified->type, body: $classified->value),
        };
    }

    private function fromUpload(UploadedFile $file): StashDraft
    {
        $bytes = $file->get();

        if ($bytes === false) {
            throw InvalidImage::unreadable();
        }

        return new StashDraft(type: StashType::Image, fileBytes: $bytes, fileMime: $this->images->mime($bytes));
    }

    private function fromUrl(ClassifiedInput $classified): StashDraft
    {
        $normalized = UrlNormalizer::normalize($classified->value);
        $host = $normalized === null ? null : UrlParts::parse($normalized)?->host;

        return new StashDraft(
            type: $classified->type,
            url: $classified->value,
            urlHash: $normalized === null ? null : UrlNormalizer::hash($normalized),
            domain: $host === null ? null : preg_replace(pattern: '/^www\./', replacement: '', subject: $host),
        );
    }
}
