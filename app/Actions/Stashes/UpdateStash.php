<?php

declare(strict_types=1);

namespace App\Actions\Stashes;

use App\Enums\FileRole;
use App\Models\Stash;
use App\Pipeline\ContentHash;
use App\Pipeline\StartPipeline;

/**
 * Applies the user's edits to a stash: title, body and the privacy flag. When something the pipeline reads
 * changed (the hash of type, URL, body and file), the pipeline starts again; a new title or privacy flag
 * alone does not need that.
 */
final readonly class UpdateStash
{
    public function __construct(
        private StartPipeline $pipeline,
    ) {}

    /**
     * @param  array<string, mixed>  $changes  any of title, body, is_private
     */
    public function update(Stash $stash, array $changes): void
    {
        $stash->fill($changes);

        $original = $stash->files()->where('role', FileRole::Original->value)->first();
        $hash = ContentHash::of($stash->type, $stash->url, $stash->body, $original?->sha256);
        $contentChanged = $hash !== $stash->content_hash;

        $stash->content_hash = $hash;
        $stash->save();

        if ($contentChanged) {
            $this->pipeline->start($stash);
        }
    }
}
