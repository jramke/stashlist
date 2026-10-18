<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // A second, smaller thumbnail for the cards of the feed (see ImageProcessor).
        Schema::table('stash_files', function (Blueprint $table) {
            $table->enum('role', ['original', 'thumb', 'thumb_small', 'preview', 'screenshot', 'og'])->change();
        });
    }

    public function down(): void
    {
        // Rows of the new role would not fit the old list. Their objects stay on the disk, unreferenced.
        DB::table('stash_files')->where('role', 'thumb_small')->delete();

        Schema::table('stash_files', function (Blueprint $table) {
            $table->enum('role', ['original', 'thumb', 'preview', 'screenshot', 'og'])->change();
        });
    }
};
