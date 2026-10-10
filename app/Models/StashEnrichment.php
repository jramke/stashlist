<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * What the machine learned about a stash. Stage 1 (extraction) is local and always runs; stage 2 (the LLM
 * columns) stays empty for users who turned smart features off (users.ai_enabled).
 *
 * @property int $stash_id
 * @property int $user_id
 * @property string|null $title
 * @property string|null $description
 * @property string|null $extracted_text
 * @property list<array{hex: string, pct: float}>|null $colors
 * @property string|null $extract_hash
 * @property CarbonImmutable|null $extracted_at
 * @property string|null $summary
 * @property string|null $ocr_text
 * @property list<string>|null $objects
 * @property string|null $language
 * @property string|null $llm_provider
 * @property string|null $llm_model
 * @property int|null $prompt_version
 * @property string|null $enrich_hash
 * @property CarbonImmutable|null $enriched_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable([
    'stash_id',
    'user_id',
    'title',
    'description',
    'extracted_text',
    'colors',
    'extract_hash',
    'extracted_at',
    'summary',
    'ocr_text',
    'objects',
    'language',
    'llm_provider',
    'llm_model',
    'prompt_version',
    'enrich_hash',
    'enriched_at',
])]
final class StashEnrichment extends Model
{
    use BelongsToUser;

    public $incrementing = false;

    protected $primaryKey = 'stash_id';

    /**
     * @return array<string, string>
     */
    #[\Override]
    protected function casts(): array
    {
        return [
            'colors' => 'array',
            'objects' => 'array',
            'extracted_at' => 'datetime',
            'enriched_at' => 'datetime',
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
