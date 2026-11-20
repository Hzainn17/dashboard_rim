<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

#[Fillable([
    'title',
    'category',
    'location',
    'caption',
    'image_url',
    'sort_order',
])]
class LoginPortfolio extends Model
{
    public const CACHE_KEY = 'studio.login_portfolios.slides';

    /**
     * Automatically clear cached login slides whenever portfolios change.
     */
    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget(self::CACHE_KEY));
        static::deleted(fn () => Cache::forget(self::CACHE_KEY));
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    /**
     * Return cached formatted portfolio slides for the login screen.
     *
     * @return list<array{id: int, src: string, title: string, category: string, location: string, caption: string}>
     */
    public static function cachedSlides(): array
    {
        return Cache::remember(
            self::CACHE_KEY,
            now()->addMinutes(30),
            fn (): array => static::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->map(fn (LoginPortfolio $p): array => [
                    'id' => $p->id,
                    'src' => $p->image_url,
                    'title' => $p->title,
                    'category' => $p->category ?? 'Arsitektur',
                    'location' => $p->location ?? 'Indonesia',
                    'caption' => $p->caption ?? '',
                ])
                ->values()
                ->all(),
        );
    }
}
