<?php

declare(strict_types=1);

namespace App\Data;

use Illuminate\Pagination\LengthAwarePaginator;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Where a numbered list is: for the pages that show their rows a page at a time (the feed scrolls instead).
 */
#[TypeScript]
final readonly class PagingData
{
    public function __construct(
        public int $page,
        public int $last_page,
        public int $total,
    ) {}

    /**
     * @param  LengthAwarePaginator<int, mixed>  $paginator
     */
    public static function of(LengthAwarePaginator $paginator): self
    {
        return new self($paginator->currentPage(), $paginator->lastPage(), $paginator->total());
    }
}
