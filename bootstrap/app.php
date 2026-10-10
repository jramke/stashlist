<?php

declare(strict_types=1);

use App\Data\ToastData;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\Idempotent;
use App\Http\Middleware\LimitJsonBody;
use App\Support\StashLimitReached;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Laravel\Sanctum\Http\Middleware\CheckForAnyAbility;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'abilities' => CheckAbilities::class,
            'ability' => CheckForAnyAbility::class,
            'idempotent' => Idempotent::class,
            'json.limit' => LimitJsonBody::class,
        ]);
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // A save over the plan's cap: the API answers like a rejected input, the web app with a toast.
        $exceptions->render(function (StashLimitReached $limit, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(
                    ['message' => $limit->getMessage(), 'errors' => ['input' => [$limit->getMessage()]]],
                    422,
                );
            }

            ToastData::error($limit->getMessage())->flash();

            return back();
        });
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })
    ->create();
