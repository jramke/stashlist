<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\MarketingData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class HomeController extends Controller
{
    /**
     * Signed-in users land in their feed; everyone else sees the front page.
     */
    public function __invoke(Request $request): Response|RedirectResponse
    {
        if ($request->user() !== null) {
            return to_route('stashes.index');
        }

        return Inertia::render('marketing/home', ['marketing' => MarketingData::resolve()]);
    }
}
