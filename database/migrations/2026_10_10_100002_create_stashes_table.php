<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // User-owned truth. The machine never writes title, body, url or is_private.
        Schema::create('stashes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['link', 'note', 'image', 'file', 'color']);
            $table->string('subtype', 24)->nullable(); // machine-set: article, product, video, ...
            $table->string('title', 500)->nullable(); // user override only
            $table->mediumText('body')->nullable(); // user text: note body, comment, quote, color value
            $table->string('url', 2048)->nullable();
            $table->binary('url_hash', length: 32, fixed: true)->nullable(); // sha256(normalized url), links only
            $table->string('domain')->nullable();
            $table->json('meta')->nullable(); // machine-set, per type
            $table->boolean('is_private')->default(false);
            $table->char('content_hash', 64)->nullable(); // sha256 of the user-controlled source
            $table->enum('ai_status', ['skipped', 'pending', 'processing', 'done', 'failed'])->default('pending');
            $table->enum('ai_stage', ['extract', 'enrich', 'embed', 'index'])->nullable();
            $table->string('ai_error', 40)->nullable(); // reason code: fetch_blocked, llm_refused, quota, ...
            $table->timestamp('processed_at')->nullable(); // last fully successful run
            $table->timestamp('indexed_at')->nullable();
            $table->timestamps();

            $table->unique(['id', 'user_id'], 'stashes_id_user_unique'); // target of composite foreign keys
            $table->unique(['user_id', 'url_hash'], 'stashes_user_url_unique'); // NULLs allowed: only links dedupe
            $table->index(['user_id', 'created_at', 'id'], 'stashes_feed_idx'); // default feed, keyset pagination
            $table->index(['user_id', 'type', 'created_at'], 'stashes_type_idx');
            $table->index(['user_id', 'ai_status'], 'stashes_status_idx');
            $table->index(['ai_status', 'updated_at'], 'stashes_sweep_idx'); // stuck-job sweeper (global)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stashes');
    }
};
