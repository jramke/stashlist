<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // The vectors of a stash, kept here as well as in the search index so that the index can be rebuilt without
        // calling a provider, and so a changed model or recipe can be found row by row. One row per stash and
        // embedder; the embedder name (text_v1, text_v2) is the key of the Meilisearch embedder, and two
        // generations can live side by side while a new model is filled in.
        Schema::create('stash_embeddings', function (Blueprint $table) {
            $table->unsignedBigInteger('stash_id');
            $table->string('embedder', 32);
            $table->unsignedBigInteger('user_id');
            $table->string('model', 100); // text-embedding-3-large
            $table->unsignedSmallInteger('dimensions');
            $table->unsignedSmallInteger('recipe_version'); // version of the embedding text template
            $table->char('input_hash', 64); // sha256 of the embedding text and settings: unchanged means skip
            $table->binary('vector'); // float32 little-endian, dimensions * 4 bytes
            $table->timestamps();

            $table->primary(['stash_id', 'embedder']);
            $table->index(['embedder', 'model', 'recipe_version'], 'stash_embeddings_stale_idx');
            $table->index('user_id', 'stash_embeddings_user_idx');
            $table
                ->foreign(['stash_id', 'user_id'], 'stash_embeddings_stash_fk')
                ->references(['id', 'user_id'])
                ->on('stashes')
                ->cascadeOnDelete();
        });

        // A binary column is a BLOB in Laravel; the plan's VARBINARY keeps the row small and the size bounded.
        DB::statement('ALTER TABLE stash_embeddings MODIFY `vector` VARBINARY(8192) NOT NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('stash_embeddings');
    }
};
