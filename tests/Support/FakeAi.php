<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Ai\Agents\StashEnricher;
use Closure;
use Laravel\Ai\Gateway\FakeTextGateway;
use Laravel\Ai\Responses\Data\Meta;
use Laravel\Ai\Responses\Data\TextUsage;
use Laravel\Ai\Responses\StructuredTextResponse;

/**
 * Turns AI on for a test with the model faked: no request leaves, and a prompt nobody planned for fails the
 * test. Tests run with STASHLIST_AI=false, so only the ones that call this exercise the AI stages.
 */
final class FakeAi
{
    /**
     * @param  array<int, array<string, mixed>|Closure>|Closure  $answers  one per expected prompt, in order
     */
    public static function install(array|Closure $answers = []): FakeTextGateway
    {
        config(['stashlist.ai.enabled' => true]);

        return StashEnricher::fake($answers)->preventStrayPrompts();
    }

    /**
     * A good answer: five tags, a summary, a subtype and a language.
     *
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    public static function answer(array $changes = []): array
    {
        return [
            'title' => 'How to raise a sourdough starter',
            'summary' => 'A week-long guide to building a lively sourdough starter from flour and water.',
            'tags' => ['sourdough', 'baking', 'bread', 'fermentation', 'recipes'],
            'subtype' => 'article',
            'language' => 'en',
            ...$changes,
        ];
    }

    /**
     * An answer that also reports what it used, for the tests of cost.
     *
     * @param  array<string, mixed>  $answer
     */
    public static function response(array $answer, int $tokensIn, int $tokensOut): StructuredTextResponse
    {
        return new StructuredTextResponse(
            $answer,
            (string)json_encode($answer),
            new TextUsage($tokensIn, $tokensOut),
            new Meta('openai', 'gpt-5-mini'),
        );
    }
}
