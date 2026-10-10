<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Persistent highlights. The extension finds the passage again on the live page by quote and context;
        // text that was deleted or rewritten is simply not painted, and the highlight stays in the library.
        // No soft deletes and no tombstones: a client syncs through a list of ids and versions, and a highlight
        // that vanished from the list was deleted.
        Schema::create('stash_highlights', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('stash_id');
            $table->unsignedBigInteger('user_id');
            $table->text('text'); // the exact passage (the TextQuoteSelector's exact), capped by config
            $table->string('prefix', 200)->default(''); // up to 64 characters before it, to tell equal passages apart
            $table->string('suffix', 200)->default(''); // up to 64 characters after it
            $table->unsignedInteger('start_offset')->nullable(); // position in the page text at capture time: a hint, never trusted
            $table->json('range_hint')->nullable(); // paths of the start and end containers: a hint for a faster lookup
            $table->string('color', 16)->nullable(); // null is the default color
            $table->string('note', 1000)->nullable();
            $table->unsignedInteger('revision')->default(1); // +1 on every change: what a client compares to see an edit
            $table->timestamps();

            $table->index('stash_id', 'stash_highlights_stash_idx');
            $table->index(['user_id', 'updated_at'], 'stash_highlights_user_idx');
            $table
                ->foreign(['stash_id', 'user_id'], 'stash_highlights_stash_fk')
                ->references(['id', 'user_id'])
                ->on('stashes')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stash_highlights');
    }
};
