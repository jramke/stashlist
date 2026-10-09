<?php

declare(strict_types=1);

namespace App\Extraction;

use GuzzleHttp\Psr7\StreamDecoratorTrait;
use Psr\Http\Message\StreamInterface;

/**
 * A response sink that refuses more than $maxBytes. Guzzle's cURL handler writes the already decoded body
 * into it; a short write makes cURL abort the transfer, so an oversized file or a gzip bomb stops at the cap
 * instead of filling memory.
 */
final class CappedStream implements StreamInterface
{
    use StreamDecoratorTrait;

    public bool $exceeded = false;

    /** Set once the response headers are known; nothing may be written before that. */
    public int $maxBytes = 0;

    private int $written = 0;

    public function __construct(
        private readonly StreamInterface $stream,
    ) {}

    #[\Override]
    public function write(string $string): int
    {
        $this->written += strlen($string);

        if ($this->written > $this->maxBytes) {
            $this->exceeded = true;

            return 0;
        }

        return $this->stream->write($string);
    }
}
