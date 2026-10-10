<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Refuses a JSON body over the API's size cap before it is read (plan 6.3: JSON up to 1 MB). Files in a
 * multipart body have their own caps in the form request.
 */
final class LimitJsonBody
{
    public function handle(Request $request, Closure $next): Response
    {
        $max = config()->integer('stashlist.api.max_json_bytes');
        $declared = (int)$request->header('Content-Length', '0');

        if ($request->isJson() && ($declared > $max || strlen($request->getContent()) > $max)) {
            return response()->json(['message' => 'The request body is too large.'], 413);
        }

        /** @var Response */
        return $next($request);
    }
}
