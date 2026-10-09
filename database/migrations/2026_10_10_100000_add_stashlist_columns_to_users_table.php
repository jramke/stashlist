<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // OAuth-only accounts have no password.
            $table->string('password')->nullable()->change();
            // UI language only. Tags and summaries follow each stash's own language.
            $table->string('locale', 8)->default('en')->after('password');
            // Account-wide switch for future work: off means new and edited stashes get no AI.
            $table->boolean('ai_enabled')->default(true)->after('locale');
            // Limits come from config('stashlist.plans.<plan>').
            $table->string('plan', 20)->default('free')->after('ai_enabled');
            // Set when account deletion starts; blocks login.
            $table->timestamp('deleting_at')->nullable()->after('plan');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['locale', 'ai_enabled', 'plan', 'deleting_at']);
            $table->string('password')->nullable(false)->change();
        });
    }
};
