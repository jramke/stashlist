<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Limits;
use Illuminate\Container\Attributes\CurrentUser;
use Inertia\Inertia;
use Inertia\Response;

final class UsageController extends Controller
{
    /**
     * What the account has used of its plan: stashes, storage and the month's summaries.
     */
    public function show(Limits $limits, #[CurrentUser] User $user): Response
    {
        return Inertia::render('settings/usage', ['usage' => $limits->usage($user->id)]);
    }
}
