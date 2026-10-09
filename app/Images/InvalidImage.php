<?php

declare(strict_types=1);

namespace App\Images;

use RuntimeException;

/**
 * Bytes that are not an image we accept. $reason is a code for ai_error or a form message.
 */
final class InvalidImage extends RuntimeException
{
    private function __construct(
        string $message,
        public readonly string $reason,
    ) {
        parent::__construct($message);
    }

    public static function unsupportedType(string $mime): self
    {
        return new self("Images of type {$mime} are not supported.", reason: 'unsupported_type');
    }

    public static function tooLarge(int $maxBytes): self
    {
        return new self("The image is larger than {$maxBytes} bytes.", reason: 'image_too_large');
    }

    public static function tooManyPixels(int $maxPixels): self
    {
        return new self("The image has more than {$maxPixels} pixels.", reason: 'image_too_many_pixels');
    }

    public static function unreadable(): self
    {
        return new self('The image could not be read.', reason: 'image_unreadable');
    }
}
