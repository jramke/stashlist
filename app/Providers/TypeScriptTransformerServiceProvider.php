<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Foundation\DevCommands;
use Illuminate\Support\Facades\File;
use Spatie\LaravelTypeScriptTransformer\TypeScriptTransformerApplicationServiceProvider as BaseTypeScriptTransformerServiceProvider;
use Spatie\TypeScriptTransformer\Transformers\AttributedClassTransformer;
use Spatie\TypeScriptTransformer\Transformers\EnumTransformer;
use Spatie\TypeScriptTransformer\TypeScriptTransformerConfigFactory;

final class TypeScriptTransformerServiceProvider extends BaseTypeScriptTransformerServiceProvider
{
    public function boot(): void
    {
        // Regenerate the TypeScript types whenever a PHP file changes during `composer dev`.
        DevCommands::artisan('typescript:transform --watch', 'types');
    }

    /**
     * Output defaults to resources/js/generated/types.d.ts (gitignored, global `App.*` namespaces).
     */
    #[\Override]
    protected function configure(TypeScriptTransformerConfigFactory $config): void
    {
        // The package refuses to run when the (gitignored) output directory is missing, e.g. on a fresh clone or in CI.
        File::ensureDirectoryExists(resource_path('js/generated'));

        $config
            ->transformer(AttributedClassTransformer::class)
            ->transformer(EnumTransformer::class)
            ->transformDirectories(app_path());
    }
}
