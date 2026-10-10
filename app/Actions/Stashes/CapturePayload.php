<?php

declare(strict_types=1);

namespace App\Actions\Stashes;

use Illuminate\Http\UploadedFile;

/**
 * What a client asks to save. The web form and the API both build one, so there is a single capture path.
 * Either $input (a URL, a CSS color or text) or $image (a picked or dropped file) is set. With both, the file
 * is the picture of the page the URL points to, as is $screenshot; $capture is what the client read from the
 * page itself.
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
        public bool $private = false,
        public array $tags = [],
        public array $collectionIds = [],
        public ?CapturedPage $capture = null,
        public ?UploadedFile $screenshot = null,
    ) {}
}
