<?php

declare(strict_types=1);

namespace App\Ai;

use App\Enums\StashType;

/**
 * The words of the request about one stash: what it is, its title, where it lives, what the person wrote and as
 * much of its text as the budget allows. The instructions are the agent's; this is the item.
 */
final class EnrichmentPrompt
{
    public static function of(EnrichmentInput $input): string
    {
        $parts = [
            'Kind of item: '.$input->type->value,
            self::line('Title', $input->title),
            self::line('Address', $input->domain),
            self::line('Description', $input->description),
            $input->body === null
                ? null
                : ($input->type === StashType::Note ? 'Text of the note' : 'Note by the person').":\n".$input->body,
            $input->text === null ? null : "Text of the page:\n".$input->text,
            $input->hasPicture() ? 'The picture is attached.' : null,
        ];

        return implode("\n\n", array_filter($parts, static fn (?string $part): bool => $part !== null));
    }

    private static function line(string $label, ?string $value): ?string
    {
        return $value === null ? null : "{$label}: {$value}";
    }
}
