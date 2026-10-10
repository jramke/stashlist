<?php

declare(strict_types=1);

namespace App\Data;

use App\Models\Collection;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Props shared with every Inertia page. This class is the single source of truth:
 * the middleware builds the props from it and the TypeScript type is generated from it.
 */
#[TypeScript]
final readonly class SharedData
{
    /**
     * @param  list<CollectionData>  $collections  the signed-in user's collections, for the navigation
     */
    public function __construct(
        public string $name,
        public AuthData $auth,
        public array $collections = [],
    ) {}

    public static function resolve(): self
    {
        $user = Auth::user();

        return new self(
            name: config()->string('app.name'),
            auth: new AuthData($user instanceof User ? UserData::fromModel($user) : null),
            collections: $user instanceof User
                ? array_values(
                    Collection::query()
                        ->withCount('stashes')
                        ->orderBy('position')
                        ->orderBy('name')
                        ->get()
                        ->map(CollectionData::fromModel(...))
                        ->all(),
                )
                : [],
        );
    }
}
