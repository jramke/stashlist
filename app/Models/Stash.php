<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AiStage;
use App\Enums\AiStatus;
use App\Enums\FileRole;
use App\Enums\StashType;
use App\Models\Concerns\BelongsToUser;
use App\Search\StashSearchable;
use Carbon\CarbonImmutable;
use Database\Factories\StashFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Something the user saved. The user owns title, body and url; the pipeline owns subtype,
 * meta and the ai_* columns.
 *
 * @property int $id
 * @property int $user_id
 * @property StashType $type
 * @property string|null $subtype
 * @property string|null $title
 * @property string|null $body
 * @property string|null $url
 * @property string|null $url_hash raw sha256 (32 bytes) of the normalized url
 * @property string|null $domain
 * @property array<string, mixed>|null $meta
 * @property string|null $content_hash
 * @property AiStatus $ai_status
 * @property AiStage|null $ai_stage
 * @property string|null $ai_error
 * @property CarbonImmutable|null $processed_at
 * @property CarbonImmutable|null $indexed_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property StashEnrichment|null $enrichment
 * @property StashFile|null $thumbnail
 * @property StashFile|null $thumbnailSmall
 * @property \Illuminate\Database\Eloquent\Collection<int, StashFile> $files
 * @property \Illuminate\Database\Eloquent\Collection<int, Tag> $tags
 * @property \Illuminate\Database\Eloquent\Collection<int, Tag> $visibleTags
 * @property \Illuminate\Database\Eloquent\Collection<int, Collection> $collections
 * @property \Illuminate\Database\Eloquent\Collection<int, StashHighlight> $highlights
 * @property \Illuminate\Database\Eloquent\Collection<int, StashEmbedding> $embeddings
 *
 * @method void searchable() queues an index write, Scout's Searchable trait
 * @method string searchableAs() the name of the search index
 * @method \Laravel\Scout\Engines\Engine searchableUsing()
 * @method static \Laravel\Scout\Builder<Stash> search(string $query = '', \Closure|null $callback = null)
 * @method static mixed withoutSyncingToSearch(\Closure $callback) runs the callback without indexing the saves in it
 */
#[Fillable(['type', 'subtype', 'title', 'body', 'url', 'url_hash', 'domain', 'meta', 'content_hash'])]
#[Hidden(['url_hash'])]
// A model's methods are its relations.
// @mago-expect lint:too-many-methods
final class Stash extends Model
{
    /** @use HasFactory<StashFactory> */
    use BelongsToUser, HasFactory, StashSearchable;

    /**
     * @return array<string, string>
     */
    #[\Override]
    protected function casts(): array
    {
        return [
            'type' => StashType::class,
            'ai_status' => AiStatus::class,
            'ai_stage' => AiStage::class,
            'meta' => 'array',
            'processed_at' => 'datetime',
            'indexed_at' => 'datetime',
        ];
    }

    /**
     * @return HasOne<StashEnrichment, $this>
     */
    public function enrichment(): HasOne
    {
        return $this->hasOne(StashEnrichment::class);
    }

    /**
     * @return HasOne<StashFile, $this>
     */
    public function thumbnail(): HasOne
    {
        return $this->hasOne(StashFile::class)->where('role', FileRole::Thumb->value);
    }

    /**
     * @return HasOne<StashFile, $this>
     */
    public function thumbnailSmall(): HasOne
    {
        return $this->hasOne(StashFile::class)->where('role', FileRole::ThumbSmall->value);
    }

    /**
     * What to call the stash: the user's title, else the scraped one, else the domain. Load `enrichment` first.
     */
    public function displayTitle(): string
    {
        return $this->title ?? $this->enrichment->title ?? $this->domain ?? 'Untitled';
    }

    /**
     * @return HasMany<StashEmbedding, $this>
     */
    public function embeddings(): HasMany
    {
        return $this->hasMany(StashEmbedding::class);
    }

    /**
     * @return HasMany<StashHighlight, $this>
     */
    public function highlights(): HasMany
    {
        return $this->hasMany(StashHighlight::class);
    }

    /**
     * @return HasMany<StashFile, $this>
     */
    public function files(): HasMany
    {
        return $this->hasMany(StashFile::class);
    }

    /**
     * Every tag row, including AI tags the user dismissed (tombstones).
     *
     * @return BelongsToMany<Tag, $this>
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'stash_tag')->withPivot([
            'source',
            'dismissed_at',
            'user_id',
            'created_at',
        ]);
    }

    /**
     * @return BelongsToMany<Tag, $this>
     */
    public function visibleTags(): BelongsToMany
    {
        return $this->tags()->wherePivotNull('dismissed_at');
    }

    /**
     * @return BelongsToMany<Collection, $this>
     */
    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(Collection::class, 'collection_stash')->withPivot(['position', 'created_at']);
    }
}
