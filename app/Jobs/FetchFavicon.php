<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\FileRole;
use App\Enums\StashType;
use App\Extraction\BlockedUrl;
use App\Extraction\FetchFailed;
use App\Extraction\ImageExtractor;
use App\Extraction\SafeHttp;
use App\Images\FaviconProcessor;
use App\Images\InvalidImage;
use App\Models\Stash;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Throwable;

/**
 * Fetches the icon of the site a link points to, from the site itself (never from a service that would be told what
 * the person keeps), and keeps it small with the stash, so a feed of a hundred cards does not call a hundred sites.
 * Best effort, and it sits in the middle of the chain, so it must never break it: a site without an icon, an icon
 * that cannot be read, a stash that is busy with another run, even an error of our own is no reason to hold up the
 * stash, and nothing here marks it.
 */
final class FetchFavicon implements ShouldQueue
{
    use Queueable;

    public int $timeout = 90;

    public int $tries = 1;

    private const MAX_CANDIDATES = 4;

    public function __construct(
        public readonly int $stashId,
        public readonly int $userId,
    ) {
        $this->onQueue('scrape');
    }

    /**
     * @return list<WithoutOverlapping>
     */
    public function middleware(): array
    {
        // A stash that another run is busy with goes without an icon this time instead of holding the chain up.
        return [new WithoutOverlapping("stash:{$this->stashId}")->dontRelease()];
    }

    public function handle(SafeHttp $http, ImageExtractor $images): void
    {
        try {
            $this->fetch($http, $images);
        } catch (Throwable $error) {
            report($error);
        }
    }

    private function fetch(SafeHttp $http, ImageExtractor $images): void
    {
        $stash = Stash::query()->where('user_id', $this->userId)->find($this->stashId);

        if (
            $stash === null ||
            $stash->type !== StashType::Link ||
            $stash->files()->where('role', FileRole::Favicon->value)->exists()
        ) {
            return;
        }

        foreach (array_slice($this->candidates($stash), offset: 0, length: self::MAX_CANDIDATES) as $url) {
            if ($this->keep($stash, $url, $http, $images)) {
                return;
            }
        }
    }

    /**
     * Where the icon may be, best first: the icons the page declared (a touch icon before a small one), the one the
     * client saw, and the place every browser looks in.
     *
     * @return list<string>
     */
    private function candidates(Stash $stash): array
    {
        $meta = $stash->meta ?? [];
        $declared = is_array($meta['icon_urls'] ?? null) ? $meta['icon_urls'] : [];

        return array_values(array_unique(array_filter(
            [
                ...$declared,
                $meta['favicon_url'] ?? null,
                $stash->domain === null ? null : "https://{$stash->domain}/favicon.ico",
            ],
            is_string(...),
        )));
    }

    private function keep(Stash $stash, string $url, SafeHttp $http, ImageExtractor $images): bool
    {
        try {
            $response = $http->get($url, [
                'image/*' => FaviconProcessor::MAX_BYTES,
                'application/octet-stream' => FaviconProcessor::MAX_BYTES,
            ]);
            $images->keepFavicon($stash, $response->body);

            return true;
        } catch (BlockedUrl|FetchFailed|InvalidImage) {
            return false;
        }
    }
}
