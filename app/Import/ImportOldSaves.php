<?php

declare(strict_types=1);

namespace App\Import;

use App\Enums\AiStatus;
use App\Models\Stash;
use App\Models\StashEnrichment;
use App\Models\User;
use App\Pipeline\ContentHash;
use App\Pipeline\StartPipeline;
use Closure;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Turns the saves of the old app into stashes of one user. Running it twice changes nothing the second time:
 * a link or image is known by its URL hash, every save by the old id kept in meta.import_id.
 *
 * The importer fetches nothing. Each new link and image goes through the normal pipeline, which looks at the
 * page or image again, so thumbnails and text are fresh; what the old app scraped (title, description,
 * favicon) stays until then, and stays for pages that no longer exist.
 */
final readonly class ImportOldSaves
{
    public function __construct(
        private OldSaveMapper $mapper,
        private StartPipeline $pipeline,
    ) {}

    /**
     * @param  iterable<OldSave>  $saves
     */
    public function import(User $user, iterable $saves): ImportReport
    {
        return $this->run($user, $saves, function (MappedSave $mapped) use ($user): void {
            $this->pipeline->start($this->create($user, $mapped));
        });
    }

    /**
     * What import() would do, without doing it.
     *
     * @param  iterable<OldSave>  $saves
     */
    public function preview(User $user, iterable $saves): ImportReport
    {
        return $this->run($user, $saves, null);
    }

    /**
     * @param  iterable<OldSave>  $saves
     * @param  Closure(MappedSave): void|null  $persist  null for a dry run
     */
    private function run(User $user, iterable $saves, ?Closure $persist): ImportReport
    {
        $report = new ImportReport;
        $hashes = $this->knownUrlHashes($user);
        $importIds = $this->knownImportIds($user);

        foreach ($saves as $save) {
            try {
                $mapped = $this->mapper->map($save);
            } catch (SaveSkipped $skipped) {
                $report->skipped($skipped->getMessage());

                continue;
            }

            $hashKey = $mapped->urlHash === null ? null : bin2hex($mapped->urlHash);

            if (
                array_key_exists($mapped->importId, $importIds) ||
                $hashKey !== null && array_key_exists($hashKey, $hashes)
            ) {
                $report->existing($mapped->type);

                continue;
            }

            $importIds[$mapped->importId] = true;

            if ($hashKey !== null) {
                $hashes[$hashKey] = true;
            }

            if ($persist !== null) {
                $persist($mapped);
            }

            $report->created($mapped->type);
        }

        return $report;
    }

    private function create(User $user, MappedSave $mapped): Stash
    {
        /** @var Stash */
        return DB::transaction(static function () use ($user, $mapped): Stash {
            $stash = new Stash([
                'type' => $mapped->type,
                'title' => $mapped->title,
                'body' => $mapped->body,
                'url' => $mapped->url,
                'url_hash' => $mapped->urlHash,
                'domain' => $mapped->domain,
                'meta' => array_filter(['import_id' => $mapped->importId, 'favicon_url' => $mapped->faviconUrl]),
                'content_hash' => ContentHash::of($mapped->type, $mapped->url, $mapped->body, fileSha256: null),
            ]);
            $stash->user_id = $user->id;
            $stash->ai_status = AiStatus::Skipped;
            $stash->created_at = $mapped->createdAt;

            // The pipeline ends with the index write; indexing here as well would write every stash twice.
            Stash::withoutSyncingToSearch($stash->save(...));

            if ($mapped->description !== null) {
                StashEnrichment::query()->create([
                    'stash_id' => $stash->id,
                    'user_id' => $user->id,
                    'description' => $mapped->description,
                ]);
            }

            return $stash;
        });
    }

    /**
     * @return array<string, true> hex url hashes the user has
     */
    private function knownUrlHashes(User $user): array
    {
        /** @var Collection<int, string> $hashes */
        $hashes = Stash::query()->where('user_id', $user->id)->whereNotNull('url_hash')->pluck('url_hash');

        return array_fill_keys(array_map(bin2hex(...), $hashes->all()), value: true);
    }

    /**
     * @return array<string, true> old save ids the user has imported already
     */
    private function knownImportIds(User $user): array
    {
        $known = [];

        foreach (Stash::query()
            ->where('user_id', $user->id)
            ->whereNotNull('meta->import_id')
            ->get(['meta']) as $stash) {
            $known[(string)($stash->meta['import_id'] ?? '')] = true;
        }

        return $known;
    }
}
