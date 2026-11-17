<?php

namespace Database\Seeders;

use App\Models\OfficeSetting;
use Illuminate\Database\Seeder;

class OfficeSettingSeeder extends Seeder
{
    /**
     * Seed the default studio office settings.
     */
    public function run(): void
    {
        OfficeSetting::query()->updateOrCreate([], [
            'office_name' => 'RIM Studio Arsitektur',
            'latitude' => -6.2087634,
            'longitude' => 106.8455990,
            'radius_meters' => 100,
            'standard_work_hours' => 9,
            'overtime_cooldown_minutes' => 60,
            'overtime_rate_per_hour' => 25000,
        ]);
    }
}
