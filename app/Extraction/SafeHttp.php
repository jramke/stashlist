<?php

declare(strict_types=1);

namespace App\Extraction;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Psr7\Uri;
use GuzzleHttp\Psr7\UriResolver;
use GuzzleHttp\Psr7\Utils;
use GuzzleHttp\RequestOptions;
use Psr\Http\Message\ResponseInterface;

/**
 * GET requests to URLs users typed in, with the protections of plan 5.6.
 *
 * Every hop goes through the UrlGuard and connects to the address that was validated (CURLOPT_RESOLVE), so a
 * DNS answer cannot change between check and connect. Redirects are followed by hand, at most five. No
 * cookies, no credentials, a byte cap and a content type allow-list.
 */
final readonly class SafeHttp
{
    private const MAX_REDIRECTS = 5;

    private const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

    public function __construct(
        private UrlGuard $guard,
        private ClientInterface $client,
    ) {}

    /**
     * @param  list<string>  $accept  allowed media types; "image/*" matches a whole family
     *
     * @throws BlockedUrl
     * @throws FetchFailed
     */
    public function get(string $url, int $maxBytes, array $accept): FetchedResponse
    {
        for ($hop = 0; $hop <= self::MAX_REDIRECTS; $hop++) {
            $response = $this->request($url, $maxBytes, $accept);
            $next = $this->redirectTarget($url, $response);

            if ($next === null) {
                return ResponseChecker::accept($url, $response, $maxBytes, $accept);
            }

            $url = $next;
        }

        throw FetchFailed::tooManyRedirects();
    }

    /**
     * @param  list<string>  $accept
     */
    private function request(string $url, int $maxBytes, array $accept): ResponseInterface
    {
        $target = $this->guard->check($url);
        $sink = new CappedStream(Utils::streamFor(''), $maxBytes);

        try {
            $response = $this->client->request('GET', $url, [
                RequestOptions::ALLOW_REDIRECTS => false,
                // The cURL handler is required for CURLOPT_RESOLVE; "stream" would select PHP's stream handler.
                RequestOptions::SINK => $sink,
                RequestOptions::DECODE_CONTENT => true,
                RequestOptions::HTTP_ERRORS => false,
                RequestOptions::CONNECT_TIMEOUT => 5,
                RequestOptions::TIMEOUT => 15,
                RequestOptions::HEADERS => [
                    'User-Agent' => config()->string('stashlist.bot.user_agent'),
                    'Accept' => implode(', ', $accept),
                ],
                'curl' => [CURLOPT_RESOLVE => [$target->curlResolveEntry()]],
            ]);
        } catch (GuzzleException $exception) {
            throw $sink->exceeded ? FetchFailed::tooLarge() : FetchFailed::failed($exception->getMessage());
        }

        if ($sink->exceeded) {
            throw FetchFailed::tooLarge();
        }

        // The sink holds the whole decoded body, whichever handler produced the response.
        $sink->rewind();

        return $response->withBody($sink);
    }

    /**
     * The absolute URL the response redirects to, or null when it is not a redirect.
     */
    private function redirectTarget(string $url, ResponseInterface $response): ?string
    {
        $location = $response->getHeaderLine('Location');

        if (! in_array($response->getStatusCode(), self::REDIRECT_STATUSES, strict: true) || $location === '') {
            return null;
        }

        return (string)UriResolver::resolve(new Uri($url), new Uri($location));
    }
}
