<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Makes a creating request safe to repeat. A client that lost the answer (a dropped connection) sends the same
 * request with the same Idempotency-Key again and gets the first answer back instead of a second stash.
 *
 * The answer is kept for a day per token and key. The same key with a different request is a mistake of the
 * client and is refused. Only successful answers are kept, so a request that failed can be corrected and
 * sent again under the same key. Without the header the request runs as usual.
 */
final class Idempotent
{
    private const KEPT_FOR = 86_400;

    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('Idempotency-Key');

        if ($key === null) {
            /** @var Response */
            return $next($request);
        }

        if (! is_string($key) || preg_match('/^[A-Za-z0-9._:\-]{1,255}$/', $key) !== 1) {
            return response()->json(
                ['message' => 'The Idempotency-Key header must be 1 to 255 letters, digits or . _ : -'],
                422,
            );
        }

        $slot = 'idempotency:'.$this->owner($request).':'.hash(algo: 'sha256', data: $key);

        try {
            // A parallel request with the same key waits for the first one and then gets its answer.
            /** @var Response */
            return Cache::lock("{$slot}:lock", 30)->block(
                10,
                fn (): Response => $this->handleOnce($request, $next, $slot),
            );
        } catch (LockTimeoutException) {
            return response()->json(['message' => 'A request with this Idempotency-Key is still running.'], 409);
        }
    }

    private function handleOnce(Request $request, Closure $next, string $slot): Response
    {
        $fingerprint = $this->fingerprint($request);
        /** @var array{fingerprint: string, status: int, body: mixed}|null $kept */
        $kept = Cache::get($slot);

        if ($kept !== null) {
            if ($kept['fingerprint'] !== $fingerprint) {
                return response()->json(['message' => 'This Idempotency-Key was used for a different request.'], 422);
            }

            return response()->json($kept['body'], $kept['status'], ['Idempotent-Replayed' => 'true']);
        }

        /** @var Response $response */
        $response = $next($request);

        if ($response instanceof JsonResponse && $response->isSuccessful()) {
            Cache::put(
                $slot,
                [
                    'fingerprint' => $fingerprint,
                    'status' => $response->getStatusCode(),
                    'body' => $response->getData(assoc: true),
                ],
                self::KEPT_FOR,
            );
        }

        return $response;
    }

    /**
     * Keys belong to a token: two clients of the same user may pick the same key.
     */
    private function owner(Request $request): string
    {
        /** @var User|null $user */
        $user = $request->user();
        $token = $user?->currentAccessToken();

        return $token instanceof PersonalAccessToken ? (string)$token->getKey() : 'none';
    }

    /**
     * What makes two requests "the same": the method, the path, the fields and the content of the files.
     */
    private function fingerprint(Request $request): string
    {
        $files = [];

        foreach ($request->allFiles() as $field => $file) {
            $files[$field] = is_array($file) ? 'many' : hash(algo: 'sha256', data: (string)$file->get());
        }

        return hash(algo: 'sha256', data: json_encode([
            $request->method(),
            $request->path(),
            $request->except(array_keys($files)),
            $files,
        ], JSON_THROW_ON_ERROR));
    }
}
