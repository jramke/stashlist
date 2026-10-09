<?php

declare(strict_types=1);

namespace App\Support;

/**
 * The validated, normalized pieces of a web URL. Build one with parse(); see UrlNormalizer for the rules.
 */
final readonly class UrlParts
{
    private function __construct(
        public string $scheme,
        public string $host,
        public ?int $port,
        public string $path,
        public string $query,
    ) {}

    public static function parse(string $url): ?self
    {
        $parts = parse_url($url);

        if ($parts === false) {
            return null;
        }

        $scheme = strtolower($parts['scheme'] ?? '');
        $host = UrlHost::normalize($parts['host'] ?? '');
        $hasCredentials = array_key_exists('user', $parts) || array_key_exists('pass', $parts);

        if (! in_array($scheme, ['http', 'https'], strict: true) || $host === null || $hasCredentials) {
            return null;
        }

        $path = UrlEncoding::encodeNonAscii($parts['path'] ?? '');

        return new self(
            scheme: $scheme,
            host: $host,
            port: $parts['port'] ?? null,
            path: $path === '' ? '/' : $path,
            query: UrlQuery::withoutTracking(UrlEncoding::encodeNonAscii($parts['query'] ?? '')),
        );
    }

    /**
     * Host, and the port unless it is the default of the scheme.
     */
    public function authority(): string
    {
        $defaultPort = $this->scheme === 'https' ? 443 : 80;

        return $this->host.($this->port === null || $this->port === $defaultPort ? '' : ':'.$this->port);
    }

    public function queryString(): string
    {
        return $this->query === '' ? '' : '?'.$this->query;
    }
}
