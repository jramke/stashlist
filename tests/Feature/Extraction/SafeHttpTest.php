<?php

declare(strict_types=1);

use App\Extraction\BlockedUrl;
use App\Extraction\FetchFailed;
use App\Extraction\SafeHttp;
use App\Extraction\UrlGuard;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use Tests\Support\FakeHostResolver;

const PUBLIC_DNS = [
    'example.com' => ['93.184.216.34'],
    'other.example.net' => ['93.184.216.35'],
    'v6.example.com' => ['2606:4700:4700::1111'],
    'internal.example.com' => ['10.0.0.5'],
];

/**
 * @param  list<Response>  $responses
 * @param  array<string, list<string>|list<list<string>>>  $dns
 * @param  list<array<string, mixed>>  $history  filled with every request that was sent
 */
function safe_http(array $responses, array $dns = PUBLIC_DNS, array &$history = []): SafeHttp
{
    $stack = HandlerStack::create(new MockHandler($responses));
    $stack->push(Middleware::history($history));

    return new SafeHttp(new UrlGuard(new FakeHostResolver($dns)), new Client(['handler' => $stack]));
}

function html(string $body = '<html>ok</html>'): Response
{
    return new Response(200, ['Content-Type' => 'text/html; charset=UTF-8'], $body);
}

function redirect_to(string $location, int $status = 302): Response
{
    return new Response($status, ['Location' => $location]);
}

test('a page is fetched with the bot identity and the pinned address', function () {
    $history = [];
    $response = safe_http([html()], history: $history)->get('https://example.com/post', 1024, ['text/html']);

    expect($response->body)
        ->toBe('<html>ok</html>')
        ->and($response->status)
        ->toBe(200)
        ->and($response->contentType)
        ->toBe('text/html')
        ->and($response->charset)
        ->toBe('utf-8')
        ->and($response->url)
        ->toBe('https://example.com/post')
        ->and($history)
        ->toHaveCount(1)
        ->and($history[0]['options']['curl'][CURLOPT_RESOLVE])
        ->toBe(['example.com:443:93.184.216.34'])
        ->and($history[0]['options']['allow_redirects'])
        ->toBeFalse()
        ->and($history[0]['request']->getHeaderLine('User-Agent'))
        ->toStartWith('StashlistBot/')
        ->and($history[0]['request']->getHeaderLine('Cookie'))
        ->toBeEmpty();
});

test('redirects are followed by hand and every hop is pinned', function () {
    $history = [];
    $response = safe_http(
        [redirect_to('https://other.example.net/next'), redirect_to('/final', status: 301), html('done')],
        history: $history,
    )->get('https://example.com/start', 1024, ['text/html']);

    expect($response->url)
        ->toBe('https://other.example.net/final')
        ->and($response->body)
        ->toBe('done')
        ->and(array_map(static fn (array $entry): array => $entry['options']['curl'][CURLOPT_RESOLVE], $history))
        ->toBe([
            ['example.com:443:93.184.216.34'],
            ['other.example.net:443:93.184.216.35'],
            ['other.example.net:443:93.184.216.35'],
        ]);
});

test('a redirect from a public host to a private one is blocked', function () {
    $history = [];
    $fetch = function () use (&$history) {
        safe_http([redirect_to('http://internal.example.com/admin')], history: $history)->get(
            'https://example.com/',
            1024,
            ['text/html'],
        );
    };

    expect($fetch)->toThrow(BlockedUrl::class);
    expect($history)->toHaveCount(1);
});

test('a redirect to a non-http scheme is blocked', function () {
    expect(fn () => safe_http([redirect_to('file:///etc/passwd')])->get('https://example.com/', 1024, ['text/html']))
        ->toThrow(BlockedUrl::class);
});

test('five redirects are followed, six are too many', function () {
    $five = array_map(static fn (): Response => redirect_to('/again'), range(start: 1, end: 5));

    expect(safe_http([...$five, html('arrived')])->get('https://example.com/', 1024, ['text/html'])->body)
        ->toBe('arrived');

    $six = array_map(static fn (): Response => redirect_to('/again'), range(start: 1, end: 6));

    try {
        safe_http([...$six, html()])->get('https://example.com/', 1024, ['text/html']);
        $this->fail('Expected FetchFailed.');
    } catch (FetchFailed $exception) {
        expect($exception->reason)->toBe('fetch_failed')->and($exception->retryable)->toBeFalse();
    }
});

test('dns rebinding cannot change the address after the check', function () {
    $resolver = new FakeHostResolver(['rebind.example.com' => [['93.184.216.34'], ['127.0.0.1']]]);
    $history = [];
    $stack = HandlerStack::create(new MockHandler([html()]));
    $stack->push(Middleware::history($history));

    $response = new SafeHttp(new UrlGuard($resolver), new Client(['handler' => $stack]))->get(
        'http://rebind.example.com/',
        1024,
        ['text/html'],
    );

    expect($response->body)
        ->toBe('<html>ok</html>')
        ->and($resolver->callsFor('rebind.example.com'))
        ->toBe(1)
        ->and($history[0]['options']['curl'][CURLOPT_RESOLVE])
        ->toBe(['rebind.example.com:80:93.184.216.34']);
});

test('ipv6 addresses are pinned in brackets', function () {
    $history = [];
    safe_http([html()], history: $history)->get('https://v6.example.com/', 1024, ['text/html']);

    expect($history[0]['options']['curl'][CURLOPT_RESOLVE])->toBe(['v6.example.com:443:[2606:4700:4700::1111]']);
});

test('a body over the cap is refused, whatever the headers say', function () {
    $body = str_repeat('a', times: 20_000);

    expect(fn () => safe_http([html($body)])->get('https://example.com/', 10_000, ['text/html']))
        ->toThrow(FetchFailed::class, 'larger than the limit');
});

test('a declared length over the cap is refused before reading', function () {
    $response = new Response(200, ['Content-Type' => 'text/html', 'Content-Length' => '5000000'], 'tiny');

    try {
        safe_http([$response])->get('https://example.com/', 1_000_000, ['text/html']);
        $this->fail('Expected FetchFailed.');
    } catch (FetchFailed $exception) {
        expect($exception->reason)->toBe('fetch_too_large');
    }
});

test('a body exactly at the cap is accepted', function () {
    $body = str_repeat('a', times: 10_000);

    expect(safe_http([html($body)])->get('https://example.com/', 10_000, ['text/html'])->body)->toBe($body);
});

test('content types on the allow-list are accepted', function (string $type, array $accept) {
    $response = new Response(200, ['Content-Type' => $type], 'data');

    expect(safe_http([$response])->get('https://example.com/', 1024, $accept)->contentType)
        ->toBe(strtolower(explode(';', $type)[0]));
})->with([
    'html for a page' => ['text/html; charset=utf-8', ['text/html']],
    'xhtml among several' => ['application/xhtml+xml', ['text/html', 'application/xhtml+xml']],
    'image family' => ['image/webp', ['image/*']],
]);

test('content types outside the allow-list are refused', function (string $type, array $accept) {
    $response = new Response(200, ['Content-Type' => $type], 'data');

    expect(fn () => safe_http([$response])->get('https://example.com/', 1024, $accept))
        ->toThrow(FetchFailed::class, 'Unsupported content type');
})->with([
    'pdf for a page' => ['application/pdf', ['text/html']],
    'html for images' => ['text/html', ['image/*']],
    'missing type' => ['', ['text/html']],
]);

test('failures carry the reason code and whether to retry', function (int $status, string $reason, bool $retryable) {
    try {
        safe_http([new Response($status, ['Content-Type' => 'text/html'], 'nope')])->get(
            'https://example.com/',
            1024,
            ['text/html'],
        );
        $this->fail('Expected FetchFailed.');
    } catch (FetchFailed $exception) {
        expect($exception->reason)->toBe($reason)->and($exception->retryable)->toBe($retryable);
    }
})->with([
    'not found' => [404, 'fetch_gone', false],
    'gone' => [410, 'fetch_gone', false],
    'forbidden' => [403, 'fetch_gone', false],
    'server error' => [500, 'fetch_failed', true],
    'rate limited' => [429, 'fetch_failed', true],
    'bad request' => [400, 'fetch_failed', false],
]);

test('a connection error is a retryable failure', function () {
    $stack = HandlerStack::create(new MockHandler([new GuzzleHttp\Exception\ConnectException(
        'timeout',
        new GuzzleHttp\Psr7\Request('GET', 'https://example.com/'),
    )]));
    $http = new SafeHttp(new UrlGuard(new FakeHostResolver(PUBLIC_DNS)), new Client(['handler' => $stack]));

    try {
        $http->get('https://example.com/', 1024, ['text/html']);
        $this->fail('Expected FetchFailed.');
    } catch (FetchFailed $exception) {
        expect($exception->reason)->toBe('fetch_failed')->and($exception->retryable)->toBeTrue();
    }
});

test('a blocked url never reaches the network', function () {
    $history = [];
    $fetch = function () use (&$history) {
        safe_http([html()], history: $history)->get('http://internal.example.com/', 1024, ['text/html']);
    };

    expect($fetch)->toThrow(BlockedUrl::class);
    expect($history)->toBeEmpty();
});
