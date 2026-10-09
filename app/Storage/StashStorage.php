<?php

declare(strict_types=1);

namespace App\Storage;

use App\Enums\FileRole;
use App\Models\Stash;
use App\Models\StashFile;
use DateTimeInterface;
use Illuminate\Contracts\Filesystem\Factory;
use Illuminate\Filesystem\FilesystemAdapter;
use RuntimeException;

/**
 * Everything about where a stash's files live: paths, writes, deletes and signed URLs.
 *
 * Objects sit at u/{user_id}/i/{stash_id}/{role}-{sha8}.{ext} on the default disk (S3 in production, the
 * local disk in development). The hash is part of the name, so a replaced file gets a new URL and the
 * objects can be cached for good. Every object has a stash_files row; the row is the inventory for
 * exports, quota sums and proof of deletion.
 */
final readonly class StashStorage
{
    private const EXTENSIONS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'image/avif' => 'avif',
    ];

    public function __construct(
        private Factory $filesystems,
    ) {}

    public static function userDirectory(int $userId): string
    {
        return "u/{$userId}";
    }

    public static function stashDirectory(int $userId, int $stashId): string
    {
        return self::userDirectory($userId)."/i/{$stashId}";
    }

    /**
     * Writes one file of a stash and records it. A stash has at most one file per role: storing a role again
     * replaces the old object and row.
     *
     * @throws RuntimeException when the disk refuses the write
     */
    public function store(Stash $stash, FileRole $role, Blob $blob): StashFile
    {
        $sha256 = hash(algo: 'sha256', data: $blob->contents);
        $extension = self::EXTENSIONS[$blob->mime] ?? 'bin';
        $path =
            self::stashDirectory($stash->user_id, $stash->id).
            "/{$role->value}-".
            substr($sha256, offset: 0, length: 8).
            ".{$extension}";

        $written = $this->disk()->put($path, $blob->contents, [
            'ContentType' => $blob->mime,
            'CacheControl' => 'private, max-age=31536000, immutable',
        ]);

        if ($written !== true) {
            throw new RuntimeException("Could not write {$path}.");
        }

        $existing = $stash->files()->where('role', $role->value)->first();

        if ($existing !== null && $existing->path !== $path) {
            $this->disk()->delete($existing->path);
        }

        return $stash->files()->updateOrCreate(
            ['role' => $role->value],
            [
                'user_id' => $stash->user_id,
                'path' => $path,
                'mime' => $blob->mime,
                'bytes' => strlen($blob->contents),
                'width' => $blob->width,
                'height' => $blob->height,
                'sha256' => $role === FileRole::Original ? $sha256 : null,
            ],
        );
    }

    /**
     * Deletes one object and its row.
     */
    public function forget(StashFile $file): void
    {
        $this->disk()->delete($file->path);
        $file->delete();
    }

    /**
     * Deletes every object of a stash. The rows go with the stash itself (cascade).
     */
    public function purgeStash(int $userId, int $stashId): void
    {
        $this->disk()->deleteDirectory(self::stashDirectory($userId, $stashId));
    }

    /**
     * Deletes every object of a user (account deletion).
     */
    public function purgeUser(int $userId): void
    {
        $this->disk()->deleteDirectory(self::userDirectory($userId));
    }

    /**
     * A signed URL for the object. The expiry is rounded to the hour so the URL stays the same for up to
     * an hour and the browser can cache it.
     */
    public function url(StashFile $file, ?DateTimeInterface $expiresAt = null): string
    {
        return $this->disk()->temporaryUrl($file->path, $expiresAt ?? now()->startOfHour()->addHours(2));
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
