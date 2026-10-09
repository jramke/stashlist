<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 64); // display form: "Web Design"
            $table->string('slug', 64); // normalized key: NFKC, lowercase, trimmed, no leading '#'
            $table->unsignedInteger('stashes_count')->default(0); // counter cache, written only by TagSync
            $table->timestamps();

            $table->unique(['user_id', 'slug'], 'tags_user_slug_unique');
            $table->unique(['id', 'user_id'], 'tags_id_user_unique');
            $table->index(['user_id', 'stashes_count'], 'tags_vocab_idx'); // "top N tags for the prompt"
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tags');
    }
};
