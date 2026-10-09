<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\FileRole;
use App\Models\Concerns\BelongsToUser;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One object in S3 that belongs to a stash: the export manifest, quota sums and deletion proof.
 *
 * @property int $id
 * @property int $stash_id
 * @property int $user_id
 * @property FileRole $role
 * @property string $path
 * @property string $mime
 * @property int $bytes
 * @property int|null $width
 * @property int|null $height
 * @property string|null $sha256
 * @property CarbonImmutable|null $created_at
 */
#[Fillable(['stash_id', 'user_id', 'role', 'path', 'mime', 'bytes', 'width', 'height', 'sha256'])]
final class StashFile extends Model
{
    use BelongsToUser;

    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    #[\Override]
    protected function casts(): array
    {
        return ['role' => FileRole::class];
    }

    /**
     * @return BelongsTo<Stash, $this>
     */
    public function stash(): BelongsTo
    {
        return $this->belongsTo(Stash::class);
    }
}
