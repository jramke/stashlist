<?php

declare(strict_types=1);

namespace App\Actions\Stashes;

use App\Models\Stash;

/**
 * The stash a capture ended up with. $created is false when the link was saved before.
 */
final readonly class CaptureResult
{
    public function __construct(
        public Stash $stash,
        public bool $created,
    ) {}
}
