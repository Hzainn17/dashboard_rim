<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EmployeeManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_employees_with_financial_data(): void
    {
        $admin = User::factory()->superAdmin()->create();
        Employee::factory()->for($admin)->create(['base_salary' => 15_000_000]);

        $response = $this->actingAs($admin)->get('/employees');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Employees/Index')
            ->has('employees', 1)
            ->has('employees.0.base_salary')
            ->has('stats')
            ->has('nextEmployeeCode')
        );
    }

    public function test_regular_admin_cannot_access_employees_page_or_manage_employees(): void
    {
        $regularAdmin = User::factory()->admin()->create();
        $target = User::factory()->create();

        $this->actingAs($regularAdmin)->get('/employees')->assertForbidden();
        $this->actingAs($regularAdmin)->post('/employees', [
            'name' => 'Staff Baru',
            'email' => 'staffbaru@rimstudio.com',
            'password' => 'password123',
            'role' => 'employee',
            'employee_code' => 'RIM-098',
            'position' => 'Drafter',
            'join_date' => '2026-01-15',
            'employment_status' => 'tetap',
            'annual_leave_quota' => 12,
            'base_salary' => 5000000,
        ])->assertForbidden();
        $this->actingAs($regularAdmin)->patch("/employees/{$target->id}/toggle-status")->assertForbidden();
        $this->actingAs($regularAdmin)->delete("/employees/{$target->id}")->assertForbidden();
    }

    public function test_regular_employee_cannot_access_employees_page(): void
    {
        $employee = User::factory()->create();

        $response = $this->actingAs($employee)->get('/employees');

        $response->assertForbidden();
    }

    public function test_admin_can_register_new_employee(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)->post('/employees', [
            'name' => 'Arif Budiman',
            'email' => 'arif@rimstudio.com',
            'password' => 'password123',
            'phone' => '081234567890',
            'role' => 'employee',
            'employee_code' => 'RIM-010',
            'position' => 'Senior Architect',
            'department' => 'Desain',
            'join_date' => '2026-01-15',
            'employment_status' => 'tetap',
            'annual_leave_quota' => 12,
            'base_salary' => 9500000,
            'fixed_allowance' => 500000,
            'overtime_rate_per_hour' => 30000,
            'bank_name' => 'BCA',
            'bank_account_number' => '1234567890',
            'bank_account_holder' => 'Arif Budiman',
        ]);

        $response->assertRedirect(route('employees.index'));
        $this->assertDatabaseHas('users', [
            'email' => 'arif@rimstudio.com',
            'role' => 'employee',
        ]);
        $this->assertDatabaseHas('employees', [
            'employee_code' => 'RIM-010',
            'position' => 'Senior Architect',
            'bank_name' => 'BCA',
        ]);
    }

    public function test_non_admin_cannot_create_or_update_employees(): void
    {
        $employee = User::factory()->create();

        $response = $this->actingAs($employee)->post('/employees', [
            'name' => 'Unauthorized User',
            'email' => 'unauth@rimstudio.com',
            'password' => 'password123',
            'role' => 'employee',
            'employee_code' => 'RIM-099',
            'position' => 'Drafter',
            'join_date' => '2026-01-15',
            'employment_status' => 'tetap',
            'annual_leave_quota' => 12,
            'base_salary' => 5000000,
        ]);

        $response->assertForbidden();
    }

    public function test_admin_can_update_employee_and_toggle_status(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $target = User::factory()->create(['name' => 'Old Name']);
        Employee::factory()->for($target)->create(['employee_code' => 'RIM-020']);

        $updateResponse = $this->actingAs($admin)->put("/employees/{$target->id}", [
            'name' => 'Updated Name',
            'email' => $target->email,
            'password' => '',
            'phone' => '0811112222',
            'role' => 'employee',
            'employee_code' => 'RIM-020',
            'position' => 'Lead Arsitek',
            'department' => 'Desain',
            'join_date' => '2025-05-01',
            'employment_status' => 'tetap',
            'annual_leave_quota' => 14,
            'base_salary' => 11000000,
            'fixed_allowance' => 1000000,
            'overtime_rate_per_hour' => 35000,
            'bank_name' => 'BNI',
            'bank_account_number' => '9988776655',
            'bank_account_holder' => 'Updated Name',
        ]);

        $updateResponse->assertRedirect(route('employees.index'));
        $this->assertDatabaseHas('users', ['id' => $target->id, 'name' => 'Updated Name']);
        $this->assertDatabaseHas('employees', ['user_id' => $target->id, 'position' => 'Lead Arsitek', 'bank_name' => 'BNI']);

        $toggleResponse = $this->actingAs($admin)->patch("/employees/{$target->id}/toggle-status");
        $toggleResponse->assertRedirect(route('employees.index'));
        $this->assertFalse($target->fresh()->is_active);
    }

    public function test_deactivated_employee_cannot_login(): void
    {
        $inactiveUser = User::factory()->inactive()->create([
            'email' => 'resigned@rimstudio.com',
        ]);

        $response = $this->post('/login', [
            'email' => $inactiveUser->email,
            'password' => 'password',
        ]);

        $this->assertGuest();
        $response->assertSessionHasErrors('email');
    }
}
