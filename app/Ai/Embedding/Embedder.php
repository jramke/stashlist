<?php

declare(strict_types=1);

namespace App\Ai\Embedding;

/**
 * Turns texts into vectors with one model at one size. The seam between the pipeline and a provider: it records
 * which model made a vector (a vector is only comparable to vectors of the same model and size), and it is
 * what tests replace.
 */
interface Embedder
{
    /**
     * The key of config('stashlist.embedders'): also the name of the embedder in the search index.
     */
    public function name(): string;

    public function provider(): string;

    public function model(): string;

    public function dimensions(): int;

    /**
     * @param  list<string>  $texts  not empty, none blank
     */
    public function embed(array $texts): Embedded;
}
