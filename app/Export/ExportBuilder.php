<?php

declare(strict_types=1);

namespace App\Export;

use App\Models\Collection;
use App\Models\Stash;
use App\Models\Tag;
use App\Models\User;
use App\Storage\StashStorage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;
use ZipArchive;

/**
 * Builds the zip of everything a user has: `stashlist.json` (the account, every stash with its tags, collections,
 * highlights, summary and text) and `files/{stash id}/` with the originals the user uploaded or the pictures that
 * came with their pages. Embeddings are left out: they are not the user's data, they can be made again.
 *
 * The JSON is written to disk stash by stash rather than built in memory, so a library of tens of thousands of
 * stashes costs a fixed amount of memory.
 */
final class ExportBuilder
{
    private const CHUNK = 200;

    public function __construct(
        private readonly StashStorage $storage,
    ) {}

    /**
     * Writes the zip to $zipPath and returns how many stashes it holds.
     *
     * @throws RuntimeException when a file cannot be read or the zip cannot be written
     */
    public function build(User $user, string $zipPath): int
    {
        $work = sys_get_temp_dir().'/stashlist-export-'.Str::random(12);
        File::ensureDirectoryExists($work);

        try {
            $files = [];
            $count = $this->writeJson($user, $work.'/stashlist.json', $files);

            $zip = new ZipArchive;

            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new RuntimeException('The export zip could not be created.');
            }

            $zip->addFile($work.'/stashlist.json', 'stashlist.json');

            foreach ($files as $entry) {
                // The zip reads its sources when it is closed, so they stay on disk until then.
                $local = $work.'/'.Str::random(16);
                file_put_contents($local, $this->storage->contents($entry['file']));
                $zip->addFile($local, $entry['name']);
            }

            if ($zip->close() !== true) {
                throw new RuntimeException('The export zip could not be written.');
            }

            return $count;
        } finally {
            File::deleteDirectory($work);
        }
    }

    /**
     * @param  list<array{file: \App\Models\StashFile, name: string}>  $files  filled with the files that belong in the zip
     */
    private function writeJson(User $user, string $path, array &$files): int
    {
        $handle = fopen($path, mode: 'wb');

        if ($handle === false) {
            throw new RuntimeException('The export could not be started.');
        }

        $head = [
            'version' => 1,
            'exported_at' => now()->toIso8601String(),
            'account' => $this->account($user),
            'tags' => $this->tags($user),
            'collections' => $this->collections($user),
        ];

        // The head without its closing brace, then the stashes one at a time.
        fwrite($handle, substr(json_encode($head, JSON_THROW_ON_ERROR), offset: 0, length: -1).',"stashes":[');

        $count = 0;

        Stash::query()
            ->where('user_id', $user->id)
            ->with(['enrichment', 'tags', 'collections', 'highlights', 'files'])
            ->chunkById(self::CHUNK, static function ($stashes) use ($handle, &$files, &$count): void {
                foreach ($stashes as $stash) {
                    fwrite(
                        $handle,
                        ($count === 0 ? '' : ',').json_encode(StashSerializer::toArray($stash), JSON_THROW_ON_ERROR),
                    );
                    $files = [...$files, ...StashSerializer::files($stash)];
                    $count++;
                }
            });

        fwrite($handle, data: ']}');
        fclose($handle);

        return $count;
    }

    /**
     * @return array<string, mixed>
     */
    private function account(User $user): array
    {
        return [
            'name' => $user->name,
            'email' => $user->email,
            'locale' => $user->locale,
            'smart_features' => $user->ai_enabled,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function tags(User $user): array
    {
        return array_values(
            Tag::query()
                ->where('user_id', $user->id)
                ->orderBy('id')
                ->get()
                ->map(static fn (Tag $tag): array => ['id' => $tag->id, 'name' => $tag->name])
                ->all(),
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function collections(User $user): array
    {
        return array_values(
            Collection::query()
                ->where('user_id', $user->id)
                ->orderBy('position')
                ->get()
                ->map(static fn (Collection $collection): array => [
                    'id' => $collection->id,
                    'name' => $collection->name,
                    'description' => $collection->description,
                ])
                ->all(),
        );
    }
}
