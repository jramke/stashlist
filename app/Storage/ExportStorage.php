<?php

declare(strict_types=1);

namespace App\Storage;

use DateTimeInterface;
use Illuminate\Contracts\Filesystem\Factory;
use Illuminate\Filesystem\FilesystemAdapter;
use RuntimeException;

/**
 * Where the zips of exports live: u/{user_id}/exports/{id}.zip on the default disk, next to the user's other
 * files, so deleting an account removes them with the rest.
 */
final readonly class ExportStorage
{
    public function __construct(
        private Factory $filesystems,
    ) {}

    /**
     * Puts a finished zip, built on local disk, where it can be downloaded from.
     *
     * @throws RuntimeException when the disk refuses the write
     */
    public function store(int $userId, int $exportId, string $localPath): string
    {
        $path = StashStorage::userDirectory($userId)."/exports/{$exportId}.zip";
        $stream = fopen($localPath, mode: 'rb');

        if ($stream === false || $this->disk()->put($path, $stream, ['ContentType' => 'application/zip']) !== true) {
            throw new RuntimeException("Could not write {$path}.");
        }

        fclose($stream);

        return $path;
    }

    /**
     * A temporary address that downloads the zip as a file with this name.
     */
    public function downloadUrl(string $path, string $name, DateTimeInterface $expiresAt): string
    {
        return $this->disk()->temporaryUrl($path, $expiresAt, [
            'ResponseContentDisposition' => 'attachment; filename="'.$name.'"',
        ]);
    }

    public function forget(string $path): void
    {
        $this->disk()->delete($path);
    }

    private function disk(): FilesystemAdapter
    {
        $disk = $this->filesystems->disk();

        assert(
            $disk instanceof FilesystemAdapter,
            description: 'The default disk must be a Laravel filesystem adapter.',
        );

        return $disk;
    }
}
