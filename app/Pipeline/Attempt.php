<?php

declare(strict_types=1);

namespace App\Pipeline;

use Carbon\CarbonImmutable;

/**
 * Which try of a stage this is and when it began, for the run log. `startedAt` is null when the log line is
 * written by the framework's failed() hook, which does not know.
 */
final readonly class Attempt
{
    public function __construct(
        public int $number,
        public ?CarbonImmutable $startedAt,
    ) {}

    public static function begin(int $number): self
    {
        return new self($number, CarbonImmutable::now());
    }

    public static function unknown(int $number): self
    {
        return new self($number, startedAt: null);
    }
}
