<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Support\SharedInput;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class ShareController extends Controller
{
    /**
     * The target of the share sheet (see `share_target` in the web manifest). It saves nothing itself, because
     * any page can link here: the feed opens with the shared text in the capture box, and one tap stashes it.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $input = SharedInput::from(
            $request->string('title')->toString(),
            $request->string('text')->toString(),
            $request->string('url')->toString(),
        );

        return to_route('stashes.index', $input === null ? [] : ['share' => mb_substr($input, start: 0, length: 2000)]);
    }
}
