<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#f8f9f9">
        <meta name="color-scheme" content="light">

        <title inertia>RIM Project</title>

        <link rel="icon" type="image/png" sizes="32x32" href="/icon-light-32x32.png?v=2">
        <link rel="icon" type="image/png" href="/rim-favicon.png?v=2">
        <link rel="shortcut icon" type="image/png" href="/rim-favicon.png?v=2">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png?v=2">

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
