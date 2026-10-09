<?php

declare(strict_types=1);

namespace App\Extraction;

/**
 * Resolves a host name to IP addresses. A seam so tests can fake DNS, including rebinding.
 */
interface HostResolver
{
    /**
     * @return list<string> A and AAAA answers, empty when the name does not resolve
     */
    public function resolve(string $host): array;
}
