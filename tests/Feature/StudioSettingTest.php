<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\OfficeSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StudioSettingTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_studio_settings_page(): void
    {
        $admin = User::factory()->superAdmin()->create();
        Employee::factory()->for($admin)->create();
        OfficeSetting::current();

        $response = $this->actingAs($admin)->get('/settings');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Settings/Index')
            ->has('setting')
            ->has('setting.office_name')
            ->has('setting.latitude')
            ->has('setting.longitude')
            ->has('setting.radius_meters')
        );
    }

    public function test_regular_employee_cannot_access_studio_settings(): void
    {
        $employee = User::factory()->create();

        $this->actingAs($employee)->get('/settings')->assertForbidden();
        $this->actingAs($employee)->put('/settings', [
            'office_name' => 'Hack',
            'latitude' => -6.2,
            'longitude' => 106.8,
            'radius_meters' => 500,
            'standard_work_hours' => 9,
            'overtime_cooldown_minutes' => 60,
            'overtime_rate_per_hour' => 25000,
        ])->assertForbidden();
    }

    public function test_admin_can_update_studio_gps_and_work_settings(): void
    {
        $admin = User::factory()->superAdmin()->create();
        Employee::factory()->for($admin)->create();

        $response = $this->actingAs($admin)->put('/settings', [
            'office_name' => 'RIM Studio Bandung',
            'latitude' => -6.9174639,
            'longitude' => 107.6191228,
            'radius_meters' => 150,
            'standard_work_hours' => 8,
            'overtime_cooldown_minutes' => 30,
            'overtime_rate_per_hour' => 35000,
        ]);

        $response->assertRedirect();

        $setting = OfficeSetting::current()->fresh();
        $this->assertEquals('RIM Studio Bandung', $setting->office_name);
        $this->assertEquals(150, $setting->radius_meters);
        $this->assertEquals(8, $setting->standard_work_hours);
        $this->assertEquals(30, $setting->overtime_cooldown_minutes);
        $this->assertEquals(35000, (float) $setting->overtime_rate_per_hour);
    }

    public function test_office_checkin_calculates_real_haversine_distance_from_studio_gps(): void
    {
        $employee = User::factory()->create();
        Employee::factory()->for($employee)->create();

        // Set studio location to Monas Jakarta (-6.1753924, 106.8271528), radius 100m
        OfficeSetting::query()->updateOrCreate([], [
            'office_name' => 'RIM Studio Jakarta',
            'latitude' => -6.1753924,
            'longitude' => 106.8271528,
            'radius_meters' => 100,
            'standard_work_hours' => 9,
            'overtime_cooldown_minutes' => 60,
            'overtime_rate_per_hour' => 25000,
        ]);

        // 1. Outside radius (~1.5 km away) -> rejected
        $farResponse = $this->actingAs($employee)->post('/attendance/check-in', [
            'mode' => 'office',
            'latitude' => -6.1900000,
            'longitude' => 106.8271528,
        ]);
        $farResponse->assertSessionHas('error');
        $this->assertDatabaseCount('attendances', 0);

        // 2. Inside radius (~20m away) -> accepted and distance recorded
        $nearResponse = $this->actingAs($employee)->post('/attendance/check-in', [
            'mode' => 'office',
            'latitude' => -6.1755500,
            'longitude' => 106.8271528,
        ]);
        $nearResponse->assertSessionHas('success');
        $this->assertDatabaseHas('attendances', [
            'user_id' => $employee->id,
            'mode' => 'office',
            'status' => 'hadir',
        ]);
    }
}
