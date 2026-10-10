<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The vector of a stash for one embedder. The key is (stash_id, embedder), which Eloquent cannot address as one
 * key, so rows are written with upsert() and read with where().
 *
 * @property int $stash_id
 * @property string $embedder key of config('stashlist.embedders'), also the Meilisearch embedder name
 * @property int $user_id
 * @property string $model
 * @property int $dimensions
 * @property int $recipe_version
 * @property string $input_hash
 * @property string $vector float32 little-endian, see VectorCodec
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['stash_id', 'embedder', 'user_id', 'model', 'dimensions', 'recipe_version', 'input_hash', 'vector'])]
final class StashEmbedding extends Model
{
    use BelongsToUser;

    public $incrementing = false;

    protected $primaryKey = null;

    /**
     * @return BelongsTo<Stash, $this>
     */
    public function stash(): BelongsTo
    {
        return $this->belongsTo(Stash::class);
    }
}
