<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Data\NewTokenData;
use App\Data\ToastData;
use App\Data\TokenData;
use App\Enums\TokenAbility;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreTokenRequest;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Lang;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * API tokens for the browser extension and other clients: one per client, shown once, revocable.
 */
final class TokenController extends Controller
{
    public function index(#[CurrentUser] User $user): Response
    {
        return Inertia::render('settings/tokens', [
            'tokens' => array_values(
                $user
                    ->tokens()
                    ->latest()
                    ->get()
                    ->map(TokenData::fromModel(...))
                    ->all(),
            ),
        ]);
    }

    public function store(StoreTokenRequest $request, #[CurrentUser] User $user): RedirectResponse
    {
        $name = $request->string('name')->toString();
        $created = $user->createToken($name, TokenAbility::values());

        Inertia::flash('new_token', new NewTokenData($name, $created->plainTextToken));

        return to_route('tokens.index');
    }

    public function destroy(#[CurrentUser] User $user, int $id): RedirectResponse
    {
        // Looked up through the user's own tokens, so someone else's token is a 404.
        /** @var PersonalAccessToken $record */
        $record = $user->tokens()->whereKey($id)->firstOrFail();
        $record->delete();

        ToastData::success(Lang::string('Token revoked.'))->flash();

        return to_route('tokens.index');
    }
}
