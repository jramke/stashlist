<?php

declare(strict_types=1);

namespace App\Extraction;

/**
 * What SafeHttp got back: the final URL after redirects and the capped body.
 */
final readonly class FetchedResponse
{
    public function __construct(
        public string $url,
        public int $status,
        public string $contentType,
        public ?string $charset,
        public string $body,
    ) {}
}
