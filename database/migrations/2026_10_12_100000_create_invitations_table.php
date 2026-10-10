<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Invitations for STASHLIST_REGISTRATION=invite: a code that lets one person register, once.
        Schema::create('invitations', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('email')->nullable(); // when set, only this address may use the code
            $table->foreignId('used_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invitations');
    }
};
