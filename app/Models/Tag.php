<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Carbon\CarbonImmutable;
use Database\Factories\TagFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property int $id
 * @property int $user_id
 * @property string $name display form, "Web Design"
 * @property string $slug normalized key
 * @property int $stashes_count counter cache, written only by TagSync
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['name', 'slug'])]
final class Tag extends Model
{
    /** @use HasFactory<TagFactory> */
    use BelongsToUser, HasFactory;

    /**
     * @return BelongsToMany<Stash, $this>
     */
    public function stashes(): BelongsToMany
    {
        return $this->belongsToMany(Stash::class, 'stash_tag')->withPivot([
            'source',
            'dismissed_at',
            'user_id',
            'created_at',
        ]);
    }
}
