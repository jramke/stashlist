<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Flat in v1. Nesting later: add a nullable parent_id and a composite FK (parent_id, user_id).
        Schema::create('collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('description', 500)->nullable();
            $table->integer('position')->default(0); // manual order in the sidebar
            $table->timestamps();

            $table->unique(['id', 'user_id'], 'collections_id_user_unique');
            $table->index(['user_id', 'position'], 'collections_user_pos_idx');
        });

        Schema::create('collection_stash', function (Blueprint $table) {
            $table->unsignedBigInteger('collection_id');
            $table->unsignedBigInteger('stash_id');
            $table->unsignedBigInteger('user_id');
            $table->integer('position')->default(0);
            $table->timestamp('created_at')->nullable();

            $table->primary(['collection_id', 'stash_id']);
            $table->index('stash_id', 'collection_stash_stash_idx');
            $table
                ->foreign(['collection_id', 'user_id'], 'collection_stash_collection_fk')
                ->references(['id', 'user_id'])
                ->on('collections')
                ->cascadeOnDelete();
            $table
                ->foreign(['stash_id', 'user_id'], 'collection_stash_stash_fk')
                ->references(['id', 'user_id'])
                ->on('stashes')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collection_stash');
        Schema::dropIfExists('collections');
    }
};
