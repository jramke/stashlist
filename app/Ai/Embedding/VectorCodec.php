<?php

declare(strict_types=1);

namespace App\Ai\Embedding;

use InvalidArgumentException;

/**
 * Vectors in the database: float32, little-endian, four bytes per dimension.
 */
final class VectorCodec
{
    /**
     * @param  list<float>  $vector
     */
    public static function pack(array $vector): string
    {
        return pack('g*', ...$vector);
    }

    /**
     * @return list<float>
     */
    public static function unpack(string $bytes): array
    {
        if ($bytes === '' || (strlen($bytes) % 4) !== 0) {
            throw new InvalidArgumentException('A vector is a whole number of four-byte floats.');
        }

        $floats = unpack('g*', $bytes);

        return (
            $floats === false
                ? throw new InvalidArgumentException('The vector could not be read.')
                : array_values(
                    array_map(floatval(...), $floats),
                )
        );
    }
}
