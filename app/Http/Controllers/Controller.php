<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;

abstract class Controller
{
    /**
     * Back to the feed the person came from, with its search and filters, so a delete or an undo does not lose
     * them. From any other page it is the plain feed.
     */
    protected function backToFeed(): RedirectResponse
    {
        $previous = url()->previous();
        $fromFeed =
            parse_url($previous, PHP_URL_HOST) === parse_url(url('/'), PHP_URL_HOST) &&
            parse_url($previous, PHP_URL_PATH) === '/stashes';

        return $fromFeed ? back() : to_route('stashes.index');
    }
}
