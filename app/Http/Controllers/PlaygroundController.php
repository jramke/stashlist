<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The playground for the interface (config `stashlist.playground`): a page that shows every state of a stash
 * card, and the pictures it uses. Not part of the product; it answers 404 where it is off.
 */
final class PlaygroundController extends Controller
{
    private const MAX_SIDE = 2400;

    private const MAX_DELAY = 10.0;

    public function cards(): Response
    {
        $this->open();

        return Inertia::render('playground/cards');
    }

    /**
     * A picture of any size and color. `delay` makes it slow (seconds), `status` makes it fail: what a card does
     * while its picture is on the way and when it never comes.
     */
    public function art(Request $request): HttpResponse
    {
        $this->open();

        $width = max(16, min(self::MAX_SIDE, $request->integer('w', 640)));
        $height = max(16, min(self::MAX_SIDE, $request->integer('h', 360)));
        $hue = $request->integer('hue', 210) % 360;
        $delay = max(0.0, min(self::MAX_DELAY, $request->float('delay')));
        $status = in_array($request->integer('status', 200), [200, 404, 500], strict: true)
            ? $request->integer('status', 200)
            : 200;

        if ($delay > 0.0) {
            usleep(max(0, (int)($delay * 1_000_000)));
        }

        if ($status !== 200) {
            abort($status);
        }

        $far = ($hue + 40) % 360;
        $size = (int)max(10, min($width, $height) / 8);
        $sunX = $this->percent($width, 28);
        $sunY = $this->percent($height, 34);
        $sunRadius = $this->percent(min($width, $height), 18);
        $hill = implode(' ', array_map(
            fn (array $point): string => 'L'.$this->percent($width, $point[0]).' '.$this->percent($height, $point[1]),
            [[40, 52], [62, 78], [78, 60]],
        ));

        return response(
            <<<SVG
            <svg xmlns="http://www.w3.org/2000/svg" width="{$width}" height="{$height}" viewBox="0 0 {$width} {$height}">
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="hsl({$hue} 70% 78%)"/>
                  <stop offset="1" stop-color="hsl({$far} 65% 58%)"/>
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#g)"/>
              <circle cx="{$sunX}" cy="{$sunY}" r="{$sunRadius}" fill="#fff" fill-opacity=".55"/>
              <path d="M0 {$height} {$hill} L{$width} {$height} Z" fill="#000" fill-opacity=".22"/>
              <text x="50%" y="92%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="{$size}" fill="#000" fill-opacity=".45">{$width}×{$height}</text>
            </svg>
            SVG,
            headers: ['Content-Type' => 'image/svg+xml', 'Cache-Control' => 'no-store'],
        );
    }

    private function percent(int|float $of, int $percent): int
    {
        return (int)round(($of * $percent) / 100);
    }

    private function open(): void
    {
        abort_unless(config()->boolean('stashlist.playground'), code: 404);
    }
}
