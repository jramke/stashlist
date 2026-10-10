<?php

declare(strict_types=1);

namespace App\Search;

use App\Ai\Embedding\VectorCodec;
use App\Models\Stash;

/**
 * The `_vectors` of a search document. Every embedder of the instance gets a key; null says "no vector for this
 * document" (not embedded yet, or the stash is something the model skips), which keeps the document searchable by
 * words. A stored vector that does not fit its embedder (another model or size, left over from a changed config)
 * is not sent: the search index would refuse the document.
 */
final class DocumentVectors
{
    /**
     * Build it from a stash with `embeddings` loaded.
     *
     * @return array<string, list<float>|null>
     */
    public static function of(Stash $stash): array
    {
        $vectors = [];

        foreach (array_keys(config()->array('stashlist.embedders')) as $key) {
            $name = (string)$key;
            $row = $stash->embeddings->firstWhere('embedder', $name);
            $fits =
                $row !== null &&
                $row->dimensions === config()->integer("stashlist.embedders.{$name}.dimensions") &&
                $row->model === config()->string("stashlist.embedders.{$name}.model");

            $vectors[$name] = $fits ? VectorCodec::unpack($row->vector) : null;
        }

        return $vectors;
    }
}
