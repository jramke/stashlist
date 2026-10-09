<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Extraction\HostResolver;

/**
 * DNS for tests. An answer is a list of addresses, or a list of such lists to answer differently on
 * each call for the same host (DNS rebinding); the last answer repeats.
 */
final class FakeHostResolver implements HostResolver
{
    /** @var array<string, int> */
    private array $calls = [];

    /**
     * @param  array<string, list<string>|list<list<string>>>  $answers
     */
    public function __construct(
        private readonly array $answers,
    ) {}

    #[\Override]
    public function resolve(string $host): array
    {
        $this->calls[$host] = ($this->calls[$host] ?? 0) + 1;
        $answer = $this->answers[$host] ?? [];

        if ($answer === [] || ! is_array($answer[0])) {
            /** @var list<string> $answer */
            return $answer;
        }

        /** @var list<list<string>> $answer */
        return $answer[min($this->calls[$host], count($answer)) - 1];
    }

    public function callsFor(string $host): int
    {
        return $this->calls[$host] ?? 0;
    }
}
