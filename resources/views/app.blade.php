<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#f8f9f9">
        <meta name="color-scheme" content="light">

        <title inertia>{{ config('app.name', 'RIM Studio Arsitektur — Dashboard Studio') }}</title>

        <link rel="icon" href="/icon-light-32x32.png" media="(prefers-color-scheme: light)">
        <link rel="icon" href="/icon-dark-32x32.png" media="(prefers-color-scheme: dark)">
        <link rel="icon" href="/icon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-icon.png">

        <!-- Fonts: Geist & Geist Mono -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&display=swap" rel="stylesheet">

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
