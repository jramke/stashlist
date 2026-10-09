<?php

declare(strict_types=1);

use App\Extraction\BlockedUrl;
use App\Extraction\UrlGuard;
use Tests\Support\FakeHostResolver;

function url_guard(): UrlGuard
{
    return new UrlGuard(new FakeHostResolver([
        'example.com' => ['93.184.216.34'],
        'v6.example.com' => ['2606:4700:4700::1111'],
        'localhost' => ['127.0.0.1'],
        'internal.example.com' => ['10.0.0.5'],
        'metadata.example.com' => ['169.254.169.254'],
        'mixed.example.com' => ['93.184.216.34', '10.0.0.5'],
    ]));
}

test('hostile urls are blocked', function (string $url) {
    url_guard()->check($url);
})
    ->with([
        'loopback' => 'http://127.0.0.1',
        'localhost' => 'http://localhost',
        'loopback v6' => 'http://[::1]',
        'cloud metadata' => 'http://169.254.169.254/latest/meta-data',
        'private 10/8' => 'http://10.0.0.5',
        'private 192.168/16' => 'http://192.168.1.1',
        'private 172.16/12' => 'http://172.16.0.1',
        'cgnat' => 'http://100.64.0.1',
        'unspecified' => 'http://0.0.0.0',
        'multicast' => 'http://224.0.0.1',
        'multicast v6' => 'http://[ff02::1]',
        'nat64 with embedded loopback' => 'http://[64:ff9b::7f00:1]',
        'decimal ip' => 'http://2130706433',
        'hex ip' => 'http://0x7f.0.0.1',
        'octal ip' => 'http://017700000001',
        'ipv4-mapped ipv6' => 'http://[::ffff:127.0.0.1]',
        'credentials' => 'http://user:pw@127.0.0.1',
        'credentials on a public host' => 'https://user:pw@example.com/',
        'file scheme' => 'file:///etc/passwd',
        'gopher scheme' => 'gopher://example.com/',
        'ssh port' => 'http://example.com:22',
        'redis port' => 'http://example.com:6379',
        'hostname that resolves to a private ip' => 'http://internal.example.com/',
        'hostname that resolves to the metadata ip' => 'http://metadata.example.com/',
        'hostname with one public and one private answer' => 'http://mixed.example.com/',
        'hostname that does not resolve' => 'http://does-not-exist.example/',
        'not a url' => 'not a url',
        'no host' => 'http:///path',
    ])
    ->throws(BlockedUrl::class);

test('public urls pass and are pinned to the validated address', function (
    string $url,
    string $host,
    int $port,
    string $entry,
) {
    $target = url_guard()->check($url);

    expect($target->host)
        ->toBe($host)
        ->and($target->port)
        ->toBe($port)
        ->and($target->curlResolveEntry())
        ->toBe($entry);
})->with([
    'https default port' => ['https://example.com/a', 'example.com', 443, 'example.com:443:93.184.216.34'],
    'http default port' => ['http://Example.com./a', 'example.com', 80, 'example.com:80:93.184.216.34'],
    'explicit allowed port' => ['http://example.com:443/a', 'example.com', 443, 'example.com:443:93.184.216.34'],
    'ipv6 answer is bracketed' => [
        'https://v6.example.com/',
        'v6.example.com',
        443,
        'v6.example.com:443:[2606:4700:4700::1111]',
    ],
    'public ip literal' => ['https://93.184.216.34/', '93.184.216.34', 443, '93.184.216.34:443:93.184.216.34'],
]);

test('a literal ip is never sent to dns', function () {
    $resolver = new FakeHostResolver(['93.184.216.34' => ['10.0.0.5']]);

    $target = new UrlGuard($resolver)->check('https://93.184.216.34/');

    expect($target->ips)->toBe(['93.184.216.34'])->and($resolver->callsFor('93.184.216.34'))->toBe(0);
});

test('numeric hosts are never sent to dns', function () {
    $resolver = new FakeHostResolver(['2130706433' => ['93.184.216.34']]);

    expect(fn () => new UrlGuard($resolver)->check('http://2130706433'))->toThrow(BlockedUrl::class);
    expect($resolver->callsFor('2130706433'))->toBe(0);
});
