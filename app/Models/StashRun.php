<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AiStage;
use App\Enums\RunStatus;
use App\Models\Concerns\BelongsToUser;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One run of a pipeline stage that calls a provider, or failed trying. Written by the pipeline only.
 *
 * @property int $id
 * @property int $stash_id
 * @property int $user_id
 * @property AiStage $stage
 * @property RunStatus $status
 * @property int $attempt
 * @property string|null $input_hash
 * @property string|null $provider
 * @property string|null $model
 * @property int|null $tokens_in
 * @property int|null $tokens_out
 * @property int|null $cost_micros USD * 1e6, estimated
 * @property int|null $duration_ms
 * @property string|null $error_code
 * @property string|null $error_class
 * @property string|null $error_msg
 * @property bool|null $retryable
 * @property CarbonImmutable $started_at
 * @property CarbonImmutable|null $finished_at
 */
#[Fillable([
    'stash_id',
    'user_id',
    'stage',
    'status',
    'attempt',
    'input_hash',
    'provider',
    'model',
    'tokens_in',
    'tokens_out',
    'cost_micros',
    'duration_ms',
    'error_code',
    'error_class',
    'error_msg',
    'retryable',
    'started_at',
    'finished_at',
])]
final class StashRun extends Model
{
    use BelongsToUser, Prunable;

    public $timestamps = false;

    /**
     * Succeeded runs are kept 30 days, failed ones 90.
     *
     * @return Builder<static>
     */
    public function prunable(): Builder
    {
        return static::query()
            ->withoutGlobalScopes()
            ->where(static function (Builder $query): void {
                $query
                    ->where('status', '!=', RunStatus::Failed->value)
                    ->where('started_at', '<', now()->subDays(30))
                    ->orWhere('started_at', '<', now()->subDays(90));
            });
    }

    /**
     * @return array<string, string>
     */
    #[\Override]
    protected function casts(): array
    {
        return [
            'stage' => AiStage::class,
            'status' => RunStatus::class,
            'retryable' => 'boolean',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Stash, $this>
     */
    public function stash(): BelongsTo
    {
        return $this->belongsTo(Stash::class);
    }
}
