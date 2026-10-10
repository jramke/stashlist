<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Stash;
use App\Models\StashHighlight;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StashHighlight>
 */
class StashHighlightFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    #[\Override]
    public function definition(): array
    {
        return [
            'stash_id' => Stash::factory(),
            // The highlight belongs to whoever owns its stash.
            'user_id' => static function (array $attributes): int {
                /** @var Stash $stash */
                $stash = Stash::query()->withoutGlobalScopes()->findOrFail($attributes['stash_id']);

                return $stash->user_id;
            },
            'text' => fake()->sentence(),
            'prefix' => fake()->lexify('??????').' '.fake()->lexify('???').' ',
            'suffix' => ' '.fake()->lexify('???').' '.fake()->lexify('??????'),
            'start_offset' => fake()->numberBetween(0, 5000),
            'revision' => 1,
        ];
    }

    /**
     * A highlight of this stash; its owner is the stash's owner.
     */
    public function onStash(Stash $stash): static
    {
        // An array, not a closure: the factory binds closure states to itself, which a static closure refuses.
        return $this->state(['stash_id' => $stash->id]);
    }
}
