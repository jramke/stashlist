<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\StashType;
use App\Models\Stash;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Stash>
 */
class StashFactory extends Factory
{
    /**
     * A link by default.
     *
     * @return array<string, mixed>
     */
    #[\Override]
    public function definition(): array
    {
        $url = fake()->unique()->url();

        return [
            'user_id' => User::factory(),
            'type' => StashType::Link,
            'title' => fake()->sentence(3),
            'url' => $url,
            'url_hash' => hash('sha256', $url, binary: true),
            'domain' => parse_url($url, PHP_URL_HOST),
        ];
    }

    public function note(): static
    {
        return $this->state([
            'type' => StashType::Note,
            'url' => null,
            'url_hash' => null,
            'domain' => null,
            'body' => fake()->paragraph(),
        ]);
    }

    public function private(): static
    {
        return $this->state(['is_private' => true]);
    }
}
