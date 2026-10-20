<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\AiStatus;
use App\Enums\ColorName;
use App\Enums\StashType;
use App\Enums\Subtype;
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
     * @param  ColorName|null  $color  pictures with this color among their dominant ones
     * @param  Subtype|null  $subtype  the kind of a link or note: articles, products, videos ...
     */
    public function __construct(
        public ?StashType $type = null,
        public array $tags = [],
        public ?string $collection = null,
        public ?AiStatus $status = null,
        public ?string $q = null,
        public ?ColorName $color = null,
        public ?Subtype $subtype = null,
    ) {}
}
