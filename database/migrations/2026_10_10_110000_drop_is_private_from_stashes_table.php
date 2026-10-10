<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Whether smart features run is a setting of the account (users.ai_enabled), not of a single stash.
        Schema::table('stashes', function (Blueprint $table) {
            $table->dropColumn('is_private');
        });
    }

    public function down(): void
    {
        Schema::table('stashes', function (Blueprint $table) {
            $table->boolean('is_private')->default(false)->after('meta');
        });
    }
};
