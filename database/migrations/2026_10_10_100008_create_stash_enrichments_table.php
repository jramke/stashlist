<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // One row per stash, owned by the machine: a re-run replaces it and cannot touch user data.
        Schema::create('stash_enrichments', function (Blueprint $table) {
            $table->unsignedBigInteger('stash_id')->primary();
            $table->unsignedBigInteger('user_id');

            // Stage 1, ExtractContent (local, also filled for private stashes)
            $table->string('title', 500)->nullable(); // scraped <title> or og:title
            $table->string('description', 1000)->nullable(); // og:description or meta description
            $table->mediumText('extracted_text')->nullable(); // readability text, capped at 100 KB
            $table->json('colors')->nullable(); // [{"hex":"#e63946","pct":0.31}, ...] up to five
            $table->char('extract_hash', 64)->nullable(); // sha256 of the fetched body or file
            $table->timestamp('extracted_at')->nullable();

            // Stage 2, GenerateEnrichment (LLM, NULL for private stashes)
            $table->text('summary')->nullable();
            $table->mediumText('ocr_text')->nullable(); // text read from images by the vision model
            $table->json('objects')->nullable();
            $table->char('language', 2)->nullable();
            $table->string('llm_provider', 32)->nullable();
            $table->string('llm_model', 100)->nullable();
            $table->unsignedSmallInteger('prompt_version')->nullable();
            $table->char('enrich_hash', 64)->nullable(); // sha256(LLM input + prompt_version + model)
            $table->timestamp('enriched_at')->nullable();

            $table->timestamps();

            $table
                ->foreign(['stash_id', 'user_id'], 'stash_enrichments_stash_fk')
                ->references(['id', 'user_id'])
                ->on('stashes')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stash_enrichments');
    }
};
