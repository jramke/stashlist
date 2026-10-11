<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\TokenAbility;
use App\Http\Requests\ConnectExtensionRequest;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * One-click connect for the browser extension: it opens this page in the browser's sign-in window, the person
 * approves, and the token travels back in the fragment of the extension's own redirect address.
 */
final class ConnectExtensionController extends Controller
{
    public function show(ConnectExtensionRequest $request): Response
    {
        return Inertia::render('connect/extension', [
            'browser' => $request->browserName(),
            'redirect_uri' => $request->redirectUri(),
            'state' => $request->state(),
        ]);
    }

    public function store(ConnectExtensionRequest $request, #[CurrentUser] User $user): HttpResponse
    {
        $token = $user->createToken($request->browserName().' extension', TokenAbility::values());

        return Inertia::location(
            $request->redirectUri().'#'
                .http_build_query([
                    'token' => $token->plainTextToken,
                    'state' => $request->state(),
                ]),
        );
    }

    public function deny(ConnectExtensionRequest $request): HttpResponse
    {
        return Inertia::location(
            $request->redirectUri().'#'
                .http_build_query([
                    'error' => 'denied',
                    'state' => $request->state(),
                ]),
        );
    }
}
