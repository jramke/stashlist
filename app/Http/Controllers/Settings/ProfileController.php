<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Data\ToastData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Lang;
use Inertia\Inertia;
use Inertia\Response;

final class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(): Response
    {
        return Inertia::render('settings/profile');
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request, #[CurrentUser] User $user): RedirectResponse
    {
        $user->name = $request->string('name')->toString();
        $user->email = $request->string('email')->toString();
        $user->save();

        ToastData::success(Lang::string('Profile updated.'))->flash();

        return to_route('profile.edit');
    }
}
