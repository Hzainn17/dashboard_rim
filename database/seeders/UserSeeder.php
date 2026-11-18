<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Seed the admin account and sample employees.
     */
    public function run(): void
    {
        $admin = User::factory()->admin()->create([
            'name' => 'Admin RIM',
            'email' => 'admin@rimstudio.com',
        ]);

        Employee::factory()->for($admin)->create([
            'employee_code' => 'RIM-001',
            'position' => 'Principal Architect',
            'department' => 'Administrasi',
            'base_salary' => 15_000_000,
            'bank_name' => 'BCA',
            'bank_account_holder' => $admin->name,
        ]);

        /** @var list<array{name: string, email: string, code: string, position: string, department: string, salary: int, bank: string, status: string}> $employees */
        $employees = [
            ['name' => 'Budi Santoso', 'email' => 'budi@rimstudio.com', 'code' => 'RIM-002', 'position' => 'Lead Arsitek', 'department' => 'Perencanaan', 'salary' => 10_000_000, 'bank' => 'BCA', 'status' => 'tetap'],
            ['name' => 'Siti Rahma', 'email' => 'siti@rimstudio.com', 'code' => 'RIM-003', 'position' => 'Drafter', 'department' => 'Perencanaan', 'salary' => 6_000_000, 'bank' => 'BNI', 'status' => 'tetap'],
            ['name' => 'Andi Pratama', 'email' => 'andi@rimstudio.com', 'code' => 'RIM-004', 'position' => 'Site Supervisor', 'department' => 'Pembangunan', 'salary' => 7_000_000, 'bank' => 'BCA', 'status' => 'kontrak'],
            ['name' => 'Dewi Lestari', 'email' => 'dewi@rimstudio.com', 'code' => 'RIM-005', 'position' => 'Digital Marketing', 'department' => 'Digital Marketing', 'salary' => 7_500_000, 'bank' => 'BNI', 'status' => 'tetap'],
            ['name' => 'Rizky Hidayat', 'email' => 'rizky@rimstudio.com', 'code' => 'RIM-006', 'position' => 'Administrasi Studio', 'department' => 'Administrasi', 'salary' => 3_500_000, 'bank' => 'BCA', 'status' => 'magang'],
        ];

        foreach ($employees as $data) {
            $user = User::factory()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'role' => UserRole::Employee,
            ]);

            Employee::factory()->for($user)->create([
                'employee_code' => $data['code'],
                'position' => $data['position'],
                'department' => $data['department'],
                'base_salary' => $data['salary'],
                'bank_name' => $data['bank'],
                'bank_account_holder' => $data['name'],
                'employment_status' => $data['status'],
            ]);
        }
    }
}
