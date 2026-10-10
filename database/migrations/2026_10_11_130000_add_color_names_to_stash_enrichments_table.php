<?php

declare(strict_types=1);

use App\Images\ColorBuckets;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // The twelve names the dominant colors are filed under, for the color filter. Kept next to the colors so a
        // browse without a search (no search engine) can filter on them too.
        Schema::table('stash_enrichments', function (Blueprint $table) {
            $table->json('color_names')->nullable()->after('colors');
        });

        DB::table('stash_enrichments')
            ->whereNotNull('colors')
            ->orderBy('stash_id')
            ->each(static function (object $row): void {
                /** @var list<array{hex: string, pct: float}> $colors */
                $colors = json_decode((string)$row->colors, associative: true);

                DB::table('stash_enrichments')
                    ->where('stash_id', $row->stash_id)
                    ->update(['color_names' => json_encode(array_map(
                        static fn ($name): string => $name->value,
                        ColorBuckets::names($colors),
                    ))]);
            });
    }

    public function down(): void
    {
        Schema::table('stash_enrichments', function (Blueprint $table) {
            $table->dropColumn('color_names');
        });
    }
};
