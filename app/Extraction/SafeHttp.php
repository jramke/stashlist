<?php

declare(strict_types=1);

namespace App\Extraction;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\ResponseException;
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
     * @param  array<string, int>  $limits  the media types to accept and the most bytes of each; "image/*"
     *                                      matches a whole family
     *
     * @throws BlockedUrl
     * @throws FetchFailed
     */
    public function get(string $url, array $limits): FetchedResponse
    {
        for ($hop = 0; $hop <= self::MAX_REDIRECTS; $hop++) {
            $response = $this->request($url, $limits);
            $next = $this->redirectTarget($url, $response);

            if ($next === null) {
                return ResponseChecker::accept($url, $response);
            }

            $url = $next;
        }

        throw FetchFailed::tooManyRedirects();
    }

    /**
     * @param  array<string, int>  $limits
     */
    private function request(string $url, array $limits): ResponseInterface
    {
        $target = $this->guard->check($url);
        $sink = new CappedStream(Utils::streamFor(''));

        try {
            $response = $this->client->request('GET', $url, [
                RequestOptions::ALLOW_REDIRECTS => false,
                // The cURL handler is required for CURLOPT_RESOLVE; "stream" would select PHP's stream handler.
                RequestOptions::SINK => $sink,
                RequestOptions::ON_HEADERS => static function (ResponseInterface $response) use ($sink, $limits): void {
                    $sink->maxBytes = ContentLimits::maxBytes($response, $limits);
                },
                RequestOptions::DECODE_CONTENT => true,
                RequestOptions::HTTP_ERRORS => false,
                RequestOptions::CONNECT_TIMEOUT => 5,
                RequestOptions::TIMEOUT => 15,
                RequestOptions::HEADERS => [
                    'User-Agent' => config()->string('stashlist.bot.user_agent'),
                    'Accept' => implode(', ', array_keys($limits)),
                ],
                'curl' => [CURLOPT_RESOLVE => [$target->curlResolveEntry()]],
            ]);
        } catch (GuzzleException $exception) {
            throw $this->failure($exception, $sink);
        }

        // Only a success can be "too large": for any other status the status itself is the answer.
        if ($sink->exceeded && $response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            throw FetchFailed::tooLarge();
        }

        // The sink holds the whole decoded body, whichever handler produced the response.
        $sink->rewind();

        return $response->withBody($sink);
    }

    /**
     * A refusal thrown while the headers arrived comes back wrapped by Guzzle; unwrap it. An abort because the
     * body outgrew the cap shows up as a write error.
     */
    private function failure(GuzzleException $exception, CappedStream $sink): FetchFailed
    {
        $previous = $exception->getPrevious();
        $response = $exception instanceof ResponseException ? $exception->getResponse() : null;

        return match (true) {
            $previous instanceof FetchFailed => $previous,
            $response !== null && ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300)
                => ResponseChecker::failureFor($response->getStatusCode()),
            $sink->exceeded => FetchFailed::tooLarge(),
            default => FetchFailed::failed($exception->getMessage()),
        };
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
