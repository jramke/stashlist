<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // A zip of everything a user has: queued, built in the background, downloadable for a week.
        Schema::create('exports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['queued', 'running', 'ready', 'failed'])->default('queued');
            $table->string('path')->nullable(); // u/{user_id}/exports/{id}.zip
            $table->unsignedBigInteger('bytes')->nullable();
            $table->unsignedInteger('stash_count')->nullable();
            $table->string('error')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at'], 'exports_user_idx');
            $table->index('expires_at', 'exports_expiry_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exports');
    }
};
