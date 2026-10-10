<?php

declare(strict_types=1);

namespace App\Images;

use App\Enums\ColorName;

/**
 * A color as hue (degrees), saturation and lightness (0 to 1), which is how people say what color something is.
 */
final readonly class Hsl
{
    public function __construct(
        public float $hue,
        public float $saturation,
        public float $lightness,
    ) {}

    /**
     * Null for something that is not a six-digit hex color.
     */
    public static function fromHex(string $hex): ?self
    {
        $match = [];

        if (preg_match('/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i', $hex, $match) !== 1) {
            return null;
        }

        $red = hexdec($match[1]) / 255;
        $green = hexdec($match[2]) / 255;
        $blue = hexdec($match[3]) / 255;

        $max = max($red, $green, $blue);
        $min = min($red, $green, $blue);
        $lightness = ($max + $min) / 2;

        if ($max === $min) {
            return new self(0.0, 0.0, $lightness);
        }

        $delta = $max - $min;
        $saturation = $lightness > 0.5 ? $delta / (2 - $max - $min) : $delta / ($max + $min);
        $hue =
            match ($max) {
                $red => (($green - $blue) / $delta) + ($green < $blue ? 6 : 0),
                $green => (($blue - $red) / $delta) + 2,
                default => (($red - $green) / $delta) + 4,
            } * 60;

        return new self($hue, $saturation, $lightness);
    }

    /**
     * What a person would call it: by lightness first (near black, near white), then how colorful it is (gray),
     * then by hue.
     */
    public function name(): ColorName
    {
        return match (true) {
            $this->lightness < 0.12 => ColorName::Black,
            $this->lightness > 0.92 => ColorName::White,
            $this->saturation < 0.12 => $this->lightness > 0.8 ? ColorName::White : ColorName::Gray,
            default => $this->byHue(),
        };
    }

    private function byHue(): ColorName
    {
        // Dark, muted oranges and yellows are browns.
        if ($this->hue >= 15 && $this->hue < 50 && $this->lightness < 0.45 && $this->saturation < 0.8) {
            return ColorName::Brown;
        }

        return match (true) {
            $this->hue < 12 || $this->hue >= 345 => $this->lightness > 0.75 ? ColorName::Pink : ColorName::Red,
            $this->hue < 40 => ColorName::Orange,
            $this->hue < 70 => ColorName::Yellow,
            $this->hue < 165 => ColorName::Green,
            $this->hue < 200 => ColorName::Teal,
            $this->hue < 255 => ColorName::Blue,
            $this->hue < 290 => ColorName::Purple,
            default => ColorName::Pink,
        };
    }
}
