<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Data\ToastData;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Lang;
use Symfony\Component\HttpFoundation\Response;

/**
 * An account whose deletion has started is locked out at once, on the web and through the API, even though the
 * job that removes the data may not have run yet.
 */
final class BlockClosingAccounts
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if (! $user instanceof User || $user->deleting_at === null) {
            /** @var Response */
            return $next($request);
        }

        if ($request->is('api/*')) {
            return response()->json(['message' => Lang::string('This account is being deleted.')], 401);
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        ToastData::error(Lang::string('This account is being deleted.'))->flash();

        return redirect()->route('login');
    }
}
