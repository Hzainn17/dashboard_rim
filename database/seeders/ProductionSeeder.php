<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Employee;
use App\Models\OfficeSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ProductionSeeder extends Seeder
{
    /**
     * Run clean initial setup for production (No dummy projects or dummy employees).
     */
    public function run(): void
    {
        // 1. Office Settings default
        OfficeSetting::query()->firstOrCreate([], [
            'office_name' => 'RIM Studio Arsitektur',
            'latitude' => -6.2087634,
            'longitude' => 106.8455990,
            'radius_meters' => 100,
            'standard_work_hours' => 9,
            'overtime_cooldown_minutes' => 60,
            'overtime_rate_per_hour' => 25000,
        ]);

        // 2. Initial Super Admin Account
        $adminEmail = env('ADMIN_EMAIL', 'admin@rimstudio.com');
        $adminName = env('ADMIN_NAME', 'Super Admin RIM');
        $adminPassword = env('ADMIN_PASSWORD', 'AdminRIM2026!');

        $admin = User::query()->firstOrCreate(
            ['email' => $adminEmail],
            [
                'name' => $adminName,
                'password' => Hash::make($adminPassword),
                'role' => UserRole::Admin,
                'is_active' => true,
                'phone' => '08123456789',
            ]
        );

        // Ensure Admin has an employee profile
        Employee::query()->firstOrCreate(
            ['user_id' => $admin->id],
            [
                'employee_code' => 'RIM-001',
                'position' => 'Principal Architect',
                'department' => 'Administrasi',
                'work_type' => 'office',
                'join_date' => now()->toDateString(),
                'base_salary' => 0,
                'fixed_allowance' => 0,
                'overtime_rate_per_hour' => 0,
                'bank_name' => 'BCA',
                'bank_account_holder' => $admin->name,
                'bank_account_number' => '-',
                'annual_leave_quota' => 12,
                'employment_status' => 'tetap',
            ]
        );
    }
}
