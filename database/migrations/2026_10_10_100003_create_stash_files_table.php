<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Inventory of everything in S3 for a stash: export manifest, quota sums, deletion proof.
        Schema::create('stash_files', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('stash_id');
            $table->unsignedBigInteger('user_id');
            $table->enum('role', ['original', 'thumb', 'preview', 'screenshot', 'og']);
            $table->string('path'); // u/{user_id}/i/{stash_id}/{role}-{sha8}.{ext}
            $table->string('mime', 100);
            $table->unsignedBigInteger('bytes');
            $table->unsignedSmallInteger('width')->nullable();
            $table->unsignedSmallInteger('height')->nullable();
            $table->char('sha256', 64)->nullable(); // originals only
            $table->timestamp('created_at')->nullable();

            $table->unique(['stash_id', 'role'], 'stash_files_role_unique');
            $table->index('user_id', 'stash_files_user_idx');
            $table
                ->foreign(['stash_id', 'user_id'], 'stash_files_stash_fk')
                ->references(['id', 'user_id'])
                ->on('stashes')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stash_files');
    }
};
