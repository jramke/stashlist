<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stash_tag', function (Blueprint $table) {
            $table->unsignedBigInteger('stash_id');
            $table->unsignedBigInteger('tag_id');
            $table->unsignedBigInteger('user_id');
            $table->enum('source', ['user', 'ai']); // 'ai' = any automatic tag (LLM or rule)
            $table->timestamp('dismissed_at')->nullable(); // the user removed an AI tag: AI must not re-add it
            $table->timestamp('created_at')->nullable();

            $table->primary(['stash_id', 'tag_id']);
            $table->index(['tag_id', 'stash_id'], 'stash_tag_tag_idx');
            $table
                ->foreign(['stash_id', 'user_id'], 'stash_tag_stash_fk')
                ->references(['id', 'user_id'])
                ->on('stashes')
                ->cascadeOnDelete();
            $table
                ->foreign(['tag_id', 'user_id'], 'stash_tag_tag_fk')
                ->references(['id', 'user_id'])
                ->on('tags')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stash_tag');
    }
};
