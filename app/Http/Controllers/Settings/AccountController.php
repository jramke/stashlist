<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Data\ToastData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\DeleteAccountRequest;
use App\Jobs\DeleteAccount;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Lang;

final class AccountController extends Controller
{
    /**
     * Starts the deletion of the account: locked at once, removed in the background.
     */
    public function destroy(DeleteAccountRequest $request, #[CurrentUser] User $user): RedirectResponse
    {
        $user->forceFill(['deleting_at' => now()])->save();

        dispatch(new DeleteAccount($user->id));

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        ToastData::info(Lang::string('Your account is being deleted. It takes a few minutes.'))->flash();

        return redirect()->route('home');
    }
}
