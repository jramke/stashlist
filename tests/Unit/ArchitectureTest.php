<?php

declare(strict_types=1);

use App\Models\Concerns\BelongsToUser;
use App\Models\OAuthAccount;
use App\Models\UsageMonthly;
use App\Models\User;
use Symfony\Component\Finder\Finder;

/**
 * Tenant isolation lives in a few chokepoints (plan 10.1). These tests keep code from going around them.
 *
 * @return array<string, string> file path (relative to app/) => contents
 */
function app_sources(): array
{
    $sources = [];

    foreach (Finder::create()
        ->files()
        ->in(dirname(__DIR__, levels: 2).'/app')
        ->name('*.php') as $file) {
        $sources[$file->getRelativePathname()] = $file->getContents();
    }

    return $sources;
}

/**
 * @param  list<string>  $allowedPrefixes
 * @return list<string> files outside $allowedPrefixes whose source matches $pattern
 */
function offenders(string $pattern, array $allowedPrefixes = []): array
{
    $found = [];

    foreach (app_sources() as $path => $source) {
        foreach ($allowedPrefixes as $prefix) {
            if (str_starts_with($path, $prefix)) {
                continue 2;
            }
        }

        if (preg_match($pattern, $source) === 1) {
            $found[] = $path;
        }
    }

    return $found;
}

arch('every model with an owner uses the ownership scope')
    ->expect('App\Models')
    ->classes()
    ->toUseTrait(BelongsToUser::class)
    ->ignoring([User::class, OAuthAccount::class, UsageMonthly::class, 'App\Models\Concerns', 'App\Models\Scopes']);

test('tenant tables are only reached through Eloquent, not the query builder', function () {
    $tables = 'stashes|stash_[a-z_]+|tags|collections|collection_stash|exports|usage_monthly';

    expect(offenders('/DB::table\(\s*[\'"]('.$tables.')[\'"]/', ['Console/']))->toBeEmpty();
});

test('Scout search is only called from the search classes', function () {
    expect(offenders('/\b[A-Z]\w+::search\(/', ['Search/']))->toBeEmpty();
});

test('tag rows are only written by TagSync', function () {
    expect(offenders('/tags\(\)\s*->\s*(attach|sync|syncWithoutDetaching|detach|toggle|updateExistingPivot)\(/', [
        'Tags/TagSync.php',
    ]))->toBeEmpty();
});
