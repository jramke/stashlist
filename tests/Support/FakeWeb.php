<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Extraction\HostResolver;
use GuzzleHttp\Client;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;

/**
 * Replaces the outside world for the app: DNS answers come from a list, HTTP responses from a queue. Install
 * it before anything fetches; every request that goes out is recorded in $history.
 */
final class FakeWeb
{
    /** @var list<array<string, mixed>> */
    public array $history = [];

    private function __construct() {}

    /**
     * @param  array<string, list<string>|list<list<string>>>  $dns
     * @param  list<Response>  $responses  handed out in order, one per request
     */
    public static function install(array $dns, array $responses): self
    {
        $web = new self;

        $stack = HandlerStack::create(new MockHandler($responses));
        $stack->push(Middleware::history($web->history));

        app()->instance(ClientInterface::class, new Client(['handler' => $stack]));
        app()->instance(HostResolver::class, new FakeHostResolver($dns));

        return $web;
    }

    public static function html(string $fixture): Response
    {
        return new Response(
            200,
            ['Content-Type' => 'text/html; charset=utf-8'],
            (string)file_get_contents(dirname(__DIR__)."/fixtures/pages/{$fixture}.html"),
        );
    }

    public static function image(string $bytes, string $type = 'image/png'): Response
    {
        return new Response(200, ['Content-Type' => $type], $bytes);
    }

    public function requestCount(): int
    {
        return count($this->history);
    }

    /**
     * @return list<string> the URLs that were requested, in order
     */
    public function urls(): array
    {
        return array_map(static fn (array $entry): string => (string)$entry['request']->getUri(), $this->history);
    }
}
