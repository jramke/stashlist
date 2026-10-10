<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Carbon\CarbonImmutable;
use Database\Factories\CollectionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * A flat, manually ordered group of stashes.
 *
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string|null $description
 * @property int $position order in the sidebar
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property int $stashes_count only when loaded with withCount('stashes')
 */
#[Fillable(['name', 'description', 'position'])]
final class Collection extends Model
{
    /** @use HasFactory<CollectionFactory> */
    use BelongsToUser, HasFactory;

    /**
     * @return BelongsToMany<Stash, $this>
     */
    public function stashes(): BelongsToMany
    {
        return $this->belongsToMany(Stash::class, 'collection_stash')->withPivot(['position', 'created_at']);
    }
}
