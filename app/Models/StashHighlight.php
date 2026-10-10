<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Carbon\CarbonImmutable;
use Database\Factories\StashHighlightFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A passage the user marked on a page: the exact text plus a little of what surrounds it, which is how the
 * browser extension finds it again. The user owns every column.
 *
 * @property int $id
 * @property int $stash_id
 * @property int $user_id
 * @property string $text
 * @property string $prefix
 * @property string $suffix
 * @property int|null $start_offset a hint, never trusted
 * @property array<string, mixed>|null $range_hint a hint, never trusted
 * @property string|null $color
 * @property string|null $note
 * @property int $revision starts at 1 and grows with every change
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property Stash $stash
 */
#[Fillable(['text', 'prefix', 'suffix', 'start_offset', 'range_hint', 'color', 'note'])]
final class StashHighlight extends Model
{
    /** @use HasFactory<StashHighlightFactory> */
    use BelongsToUser, HasFactory;

    /**
     * The defaults of the database, so a highlight that was just made has them in memory too.
     *
     * @var array<string, mixed>
     */
    protected $attributes = ['prefix' => '', 'suffix' => '', 'revision' => 1];

    /**
     * The search document of the stash holds its highlights, so a change to one reindexes the stash.
     */
    #[\Override]
    protected static function booted(): void
    {
        static::updating(static function (self $highlight): void {
            $highlight->revision++;
        });
        static::saved(static fn (self $highlight) => Stash::reindex([$highlight->stash_id]));
        static::deleted(static fn (self $highlight) => Stash::reindex([$highlight->stash_id]));
    }

    /**
     * @return array<string, string>
     */
    #[\Override]
    protected function casts(): array
    {
        return ['start_offset' => 'integer', 'range_hint' => 'array'];
    }

    /**
     * @return BelongsTo<Stash, $this>
     */
    public function stash(): BelongsTo
    {
        return $this->belongsTo(Stash::class);
    }
}
