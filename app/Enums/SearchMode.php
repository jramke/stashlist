<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * How a search is run. The interface asks twice while someone types: "keyword" at once (no provider call, so it
 * answers in tens of milliseconds) and "hybrid" after a longer pause, which adds the meaning of the query.
 */
enum SearchMode: string
{
    case Keyword = 'keyword';
    case Hybrid = 'hybrid';
}
