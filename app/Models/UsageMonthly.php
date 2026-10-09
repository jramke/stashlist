<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Per user and month usage. The key is (user_id, period), which Eloquent cannot address as one key, so
 * rows are written with upsert() and read with where().
 *
 * @property int $user_id
 * @property string $period '2026-10'
 * @property int $llm_stashes
 * @property int $embed_stashes
 * @property int $tokens_in
 * @property int $tokens_out
 * @property int $cost_micros USD * 1e6, estimated
 */
#[Fillable(['user_id', 'period', 'llm_stashes', 'embed_stashes', 'tokens_in', 'tokens_out', 'cost_micros'])]
final class UsageMonthly extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $table = 'usage_monthly';

    protected $primaryKey = null;

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
