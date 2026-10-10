<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ExportStatus;
use App\Models\Concerns\BelongsToUser;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * An export of everything a user has, as a zip built in the background.
 *
 * @property int $id
 * @property int $user_id
 * @property ExportStatus $status
 * @property string|null $path
 * @property int|null $bytes
 * @property int|null $stash_count
 * @property string|null $error
 * @property CarbonImmutable|null $expires_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['status', 'path', 'bytes', 'stash_count', 'error', 'expires_at'])]
final class Export extends Model
{
    use BelongsToUser;

    /**
     * The defaults of the database, so an export that was just made has them in memory too.
     *
     * @var array<string, mixed>
     */
    protected $attributes = ['status' => 'queued'];

    /**
     * @return array<string, string>
     */
    #[\Override]
    protected function casts(): array
    {
        return ['status' => ExportStatus::class, 'expires_at' => 'datetime'];
    }

    public function isDownloadable(): bool
    {
        return $this->status === ExportStatus::Ready && $this->expires_at !== null && $this->expires_at->isFuture();
    }
}
