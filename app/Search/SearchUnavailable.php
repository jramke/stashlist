<?php

declare(strict_types=1);

namespace App\Search;

use Meilisearch\Exceptions\ExceptionInterface;
use RuntimeException;

/**
 * The search engine did not answer a search: it is down, or its index is not set up. The cause is reported
 * where it happened; callers show the user a message instead of an error page.
 */
final class SearchUnavailable extends RuntimeException
{
    public static function because(ExceptionInterface $cause): self
    {
        return new self('The search engine could not answer.', previous: $cause);
    }
}
