<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Ai\AiGuard;
use App\Ai\Llm;
use App\Data\MarketingData;
use App\Data\PrivacyData;
use App\Enums\SocialProvider;
use Inertia\Inertia;
use Inertia\Response;

final class PrivacyController extends Controller
{
    /** How the providers of config/ai.php are written in running text. */
    private const PROVIDERS = [
        'openai' => 'OpenAI',
        'anthropic' => 'Anthropic',
        'gemini' => 'Google',
        'ollama' => 'Ollama',
    ];

    /**
     * The privacy page, open to everyone: what is kept, who else sees it, and how to take it back.
     */
    public function __invoke(AiGuard $guard): Response
    {
        return Inertia::render('marketing/privacy', [
            'marketing' => MarketingData::resolve(),
            'privacy' => new PrivacyData(
                operator_name: config()->string('stashlist.operator.name'),
                operator_address: config()->string('stashlist.operator.address'),
                operator_email: config()->string('stashlist.operator.email'),
                ai: $guard->instanceHasAi(),
                ai_provider: self::PROVIDERS[Llm::configured()->provider] ?? ucfirst(Llm::configured()->provider),
                sign_in: array_map(
                    static fn (SocialProvider $provider): string => $provider->label(),
                    SocialProvider::configured(),
                ),
                object_storage: config('filesystems.default') === 's3',
            ),
        ]);
    }
}
