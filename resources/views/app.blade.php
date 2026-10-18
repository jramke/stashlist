<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light">

        <style>
            html {
                background-color: oklch(0.985 0.002 95);
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="32x32">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="icon" href="/favicon.png" type="image/png" sizes="96x96">
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
        <link rel="manifest" href="/manifest.json">
        <meta name="theme-color" content="#fbfbfa">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-title" content="{{ config('app.name', 'Laravel') }}">

        @if (config('services.umami.script') && config('services.umami.website_id'))
            <script defer src="{{ config('services.umami.script') }}" data-website-id="{{ config('services.umami.website_id') }}"></script>
        @endif

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
