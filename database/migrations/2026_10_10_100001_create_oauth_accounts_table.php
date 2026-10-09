<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Auth data, not tenant-scoped: it is read before anyone is logged in.
        Schema::create('oauth_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 20); // github, google
            $table->string('provider_id', 64); // GitHub numeric id / Google "sub", same values as in the old app
            $table->string('email')->nullable(); // last seen from the provider
            $table->string('avatar_url', 500)->nullable();
            $table->timestamps();

            $table->unique(['provider', 'provider_id'], 'oauth_accounts_provider_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oauth_accounts');
    }
};
