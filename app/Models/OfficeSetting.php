<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'office_name', 'latitude', 'longitude', 'radius_meters',
    'standard_work_hours', 'overtime_cooldown_minutes', 'overtime_rate_per_hour',
])]
class OfficeSetting extends Model
{
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
     * Get the active studio settings, creating a default row when missing.
     */
    public static function current(): self
    {
        return static::query()->firstOrCreate([], [
            'office_name' => config('app.name'),
        ]);
    }
}
