<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\StashType;

/**
 * What a piece of universal input turned out to be.
 *
 * $value is the web URL for links and images (a leading // becomes https://), the lowercase CSS
 * color for colors, and the text as typed for notes.
 */
final readonly class ClassifiedInput
{
    public function __construct(
        public StashType $type,
        public string $value,
    ) {}
}
