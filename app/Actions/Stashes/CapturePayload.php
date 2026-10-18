<?php

declare(strict_types=1);

namespace App\Actions\Stashes;

use Illuminate\Http\UploadedFile;

/**
 * What a client asks to save. The web form and the API both build one, so there is a single capture path.
 * Either $input (a URL, a CSS color or text) or $image (a picked or dropped file) is set. With both, the file
 * is the picture of the page the URL points to, as is $screenshot; $capture is what the client read from the
 * page itself. $sourceUrl is the page a picture was on when the file is saved as an image of its own (a file has
 * no address to remember it by).
 */
final readonly class CapturePayload
{
    /**
     * @param  list<string>  $tags  names; new ones are created
     * @param  list<int>  $collectionIds
     */
    public function __construct(
        public ?string $input = null,
        public ?UploadedFile $image = null,
        public ?string $title = null,
        public array $tags = [],
        public array $collectionIds = [],
        public ?CapturedPage $capture = null,
        public ?UploadedFile $screenshot = null,
        public ?string $sourceUrl = null,
    ) {}

    /**
     * What the client captured about a link: its capture block, or just the pictures it sent along; null when it
     * sent neither.
     */
    public function capturedPage(): ?CapturedPage
    {
        if ($this->capture === null && $this->image === null && $this->screenshot === null) {
            return null;
        }

        return $this->capture ?? new CapturedPage;
    }
}
