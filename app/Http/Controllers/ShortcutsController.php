<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

final class ShortcutsController extends Controller
{
    /**
     * The page that lists every keyboard shortcut of the app. The list itself lives in the client (`commands/catalog.ts`).
     */
    public function __invoke(): Response
    {
        return Inertia::render('shortcuts');
    }
}
