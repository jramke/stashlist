<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Data\ToastData;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Lang;

/**
 * The one switch for smart features (AI tags and summaries): a setting of the account, not of a stash. Turning
 * it off keeps the tags and summaries made so far and stops new ones; turning it on queues nothing.
 */
final class SmartFeaturesController extends Controller
{
    public function update(Request $request, #[CurrentUser] User $user): RedirectResponse
    {
        $request->validate(['ai_enabled' => ['required', 'boolean']]);

        $user->ai_enabled = $request->boolean('ai_enabled');
        $user->save();

        ToastData::success(Lang::string('Saved.'))->flash();

        return to_route('profile.edit');
    }
}
