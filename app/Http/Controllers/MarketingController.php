<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\MarketingData;
use App\Marketing\Changelog;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The pages anyone may read. They share the props of MarketingData; the legal ones also get the operator's details.
 */
final class MarketingController extends Controller
{
    public function pricing(): Response
    {
        return $this->page('pricing');
    }

    public function extension(): Response
    {
        return $this->page('extension');
    }

    public function docs(): Response
    {
        return $this->page('docs');
    }

    public function terms(): Response
    {
        return $this->page('terms', ['operator' => self::operator()]);
    }

    public function imprint(): Response
    {
        return $this->page('imprint', ['operator' => self::operator()]);
    }

    public function changelog(): Response
    {
        return $this->page('changelog', ['entries' => Changelog::entries()]);
    }

    /**
     * The comparison page. Every claim on it has to be checked again before it goes public, so it stays off until
     * the operator turns it on.
     */
    public function compare(): Response
    {
        abort_unless(config()->boolean('stashlist.site.compare_page'), code: 404);

        return $this->page('compare');
    }

    /**
     * @param  array<string, mixed>  $props
     */
    private function page(string $name, array $props = []): Response
    {
        return Inertia::render("marketing/{$name}", ['marketing' => MarketingData::resolve(), ...$props]);
    }

    /**
     * @return array<string, string>
     */
    private static function operator(): array
    {
        return [
            'name' => config()->string('stashlist.operator.name'),
            'address' => config()->string('stashlist.operator.address'),
            'email' => config()->string('stashlist.operator.email'),
            'phone' => config()->string('stashlist.operator.phone'),
            'vat_id' => config()->string('stashlist.operator.vat_id'),
            'register' => config()->string('stashlist.operator.register'),
        ];
    }
}
