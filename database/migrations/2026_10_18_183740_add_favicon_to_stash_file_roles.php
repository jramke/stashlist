<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // The icon of the site a link points to, fetched from the site itself, for the cards of the feed.
        Schema::table('stash_files', function (Blueprint $table) {
            $table
                ->enum('role', ['original', 'thumb', 'thumb_small', 'preview', 'screenshot', 'og', 'favicon'])
                ->change();
        });
    }

    public function down(): void
    {
        // Rows of the new role would not fit the old list. Their objects stay on the disk, unreferenced.
        DB::table('stash_files')->where('role', 'favicon')->delete();

        Schema::table('stash_files', function (Blueprint $table) {
            $table->enum('role', ['original', 'thumb', 'thumb_small', 'preview', 'screenshot', 'og'])->change();
        });
    }
};
