<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\AiStatus;
use App\Enums\StashType;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * The filters of the feed, echoed back so the UI can show what is active.
 */
#[TypeScript]
final readonly class FeedFiltersData
{
    /**
     * @param  list<int>  $tags  stashes must carry all of these tags
     * @param  string|null  $collection  a collection id, or "none" for stashes that are in no collection
     * @param  string|null  $q  the text searched for; the status filter does not apply while searching
     */
    public function __construct(
        public ?StashType $type = null,
        public array $tags = [],
        public ?string $collection = null,
        public ?AiStatus $status = null,
        public ?string $q = null,
    ) {}
}
