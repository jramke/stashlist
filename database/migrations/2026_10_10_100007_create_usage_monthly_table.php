<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Survives the pruning of stash_runs. Basis for plan limits and, later, billing.
        Schema::create('usage_monthly', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id');
            $table->char('period', 7); // '2026-10'
            $table->unsignedInteger('llm_stashes')->default(0); // stashes that went through GenerateEnrichment
            $table->unsignedInteger('embed_stashes')->default(0);
            $table->unsignedBigInteger('tokens_in')->default(0);
            $table->unsignedBigInteger('tokens_out')->default(0);
            $table->unsignedBigInteger('cost_micros')->default(0); // USD * 1e6, estimated

            $table->primary(['user_id', 'period']);
            $table->foreign('user_id', 'usage_monthly_user_fk')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usage_monthly');
    }
};
