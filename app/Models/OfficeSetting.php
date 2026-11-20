<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

#[Fillable([
    'office_name', 'company_logo_url', 'latitude', 'longitude', 'radius_meters',
    'standard_work_hours', 'overtime_cooldown_minutes', 'overtime_rate_per_hour',
])]
class OfficeSetting extends Model
{
    public const CACHE_KEY = 'studio.office_setting.current';

    /**
     * Automatically invalidate cached studio settings when saved or deleted.
     */
    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget(self::CACHE_KEY));
        static::deleted(fn () => Cache::forget(self::CACHE_KEY));
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'radius_meters' => 'integer',
            'standard_work_hours' => 'integer',
            'overtime_cooldown_minutes' => 'integer',
            'overtime_rate_per_hour' => 'decimal:2',
        ];
    }

    /**
     * Get the active studio settings (cached as plain array for safe serialization),
     * creating a default row when missing.
     */
    public static function current(): self
    {
        $attributes = Cache::remember(
            self::CACHE_KEY,
            now()->addMinutes(30),
            function (): array {
                $setting = static::query()->first();

                if (! $setting) {
                    $setting = static::query()->create([
                        'office_name' => config('app.name'),
                    ])->fresh();
                }

                return $setting->getAttributes();
            },
        );

        if (! is_array($attributes)) {
            Cache::forget(self::CACHE_KEY);

            return static::query()->firstOrCreate([], [
                'office_name' => config('app.name'),
            ])->fresh();
        }

        $instance = new static;
        $instance->setRawAttributes($attributes, true);
        $instance->exists = true;

        return $instance;
    }
}
