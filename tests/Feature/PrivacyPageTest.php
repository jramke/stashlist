<?php

declare(strict_types=1);

use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Tests\Support\FakeAi;

test('the privacy page is open to everyone and says who runs the installation', function () {
    config([
        'stashlist.operator.name' => 'Example Ltd',
        'stashlist.operator.address' => '1 Road, Town',
        'stashlist.operator.email' => 'hello@example.com',
    ]);

    $this
        ->get('/privacy')
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('marketing/privacy')
                ->where('privacy.operator_name', 'Example Ltd')
                ->where('privacy.operator_address', '1 Road, Town')
                ->where('privacy.operator_email', 'hello@example.com'),
        );

    $this->actingAs(User::factory()->create())->get('/privacy')->assertOk();
});

test('it lists the AI provider only when AI is on, and the sign-in providers that are configured', function () {
    $this->get('/privacy')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('privacy.ai', false)
        ->where('privacy.sign_in', []));

    FakeAi::install();
    config(['services.github.client_id' => 'id', 'services.github.client_secret' => 'secret']);

    $this->get('/privacy')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('privacy.ai', true)
        ->where('privacy.ai_provider', 'OpenAI')
        ->where('privacy.sign_in', ['GitHub']));
});
