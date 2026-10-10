<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // The log of pipeline stages that call a provider (and the ones that failed): what ran, what it cost and
        // why it stopped. Never holds page or note content. Pruned nightly; usage_monthly keeps the totals.
        Schema::create('stash_runs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('stash_id');
            $table->unsignedBigInteger('user_id');
            $table->enum('stage', ['extract', 'enrich', 'embed', 'index']);
            $table->enum('status', ['running', 'succeeded', 'failed', 'skipped']);
            $table->unsignedTinyInteger('attempt')->default(1);
            $table->char('input_hash', 64)->nullable();
            $table->string('provider', 32)->nullable();
            $table->string('model', 100)->nullable();
            $table->unsignedInteger('tokens_in')->nullable();
            $table->unsignedInteger('tokens_out')->nullable();
            $table->unsignedInteger('cost_micros')->nullable(); // USD * 1e6, estimated from token counts
            $table->unsignedInteger('duration_ms')->nullable();
            $table->string('error_code', 40)->nullable(); // the vocabulary of stashes.ai_error
            $table->string('error_class', 150)->nullable();
            $table->string('error_msg', 500)->nullable(); // truncated
            $table->boolean('retryable')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('finished_at')->nullable();

            $table->index(['stash_id', 'stage', 'id'], 'stash_runs_stash_idx');
            $table->index(['user_id', 'started_at'], 'stash_runs_user_idx');
            $table->index(['status', 'started_at'], 'stash_runs_status_idx');
            $table
                ->foreign(['stash_id', 'user_id'], 'stash_runs_stash_fk')
                ->references(['id', 'user_id'])
                ->on('stashes')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stash_runs');
    }
};
