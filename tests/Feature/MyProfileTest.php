<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\OfficeSetting;
use App\Models\Overtime;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MyProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_can_view_my_profile_with_kpi_and_slips_without_salary_in_profile(): void
    {
        $user = User::factory()->create(['name' => 'Rina Kartika']);
        Employee::factory()->for($user)->create([
            'position' => 'Senior Architect',
            'department' => 'Design Studio',
            'employment_status' => 'tetap',
            'join_date' => Carbon::now()->subMonths(14),
            'base_salary' => 12_000_000,
            'fixed_allowance' => 1_000_000,
            'bank_name' => 'BCA',
            'bank_account_number' => '8877665544',
        ]);

        Attendance::factory()->for($user)->create([
            'date' => Carbon::today(),
            'status' => 'hadir',
        ]);

        $project = Project::factory()->create(['owner_id' => $user->id]);
        $project->members()->attach($user->id, ['role_in_project' => 'Lead']);

        ProjectTask::create([
            'project_id' => $project->id,
            'title' => 'Task 1',
            'assignee_id' => $user->id,
            'status' => 'done',
        ]);
        ProjectTask::create([
            'project_id' => $project->id,
            'title' => 'Task 2',
            'assignee_id' => $user->id,
            'status' => 'in_progress',
        ]);

        Overtime::factory()->for($user)->for($project)->create([
            'start_at' => Carbon::today()->setHour(18),
            'end_at' => Carbon::today()->setHour(20),
            'duration_minutes' => 120,
            'status' => 'approved',
        ]);

        $payroll = Payroll::create([
            'period_name' => 'November 2026',
            'type' => 'regular',
            'period_month' => Carbon::now()->month,
            'period_year' => Carbon::now()->year,
            'start_date' => Carbon::now()->startOfMonth(),
            'end_date' => Carbon::now()->endOfMonth(),
            'status' => 'finalized',
            'generated_by' => $user->id,
            'total_amount' => 13_000_000,
        ]);

        PayrollItem::create([
            'payroll_id' => $payroll->id,
            'user_id' => $user->id,
            'base_salary' => 12_000_000,
            'fixed_allowance' => 1_000_000,
            'net_salary' => 13_000_000,
            'bank_name' => 'BCA',
            'bank_account_number' => '8877665544',
            'bank_account_holder' => 'Rina Kartika',
        ]);

        $this->actingAs($user)
            ->get(route('my-profile.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/MyProfile')
                ->where('profile.name', 'Rina Kartika')
                ->where('profile.position', 'Senior Architect')
                ->where('profile.bank_name', 'BCA')
                ->missing('profile.base_salary')
                ->missing('profile.fixed_allowance')
                ->where('kpi.present_days_month', 1)
                ->where('kpi.active_projects_count', 1)
                ->where('kpi.total_tasks', 2)
                ->where('kpi.done_tasks', 1)
                ->where('kpi.task_completion_rate', 50)
                ->where('kpi.overtime_hours_month', 2)
                ->has('slips', 1)
                ->where('slips.0.period_name', 'November 2026')
            );
    }

    public function test_employee_can_upload_and_delete_profile_photo(): void
    {
        $user = User::factory()->create();
        Employee::factory()->for($user)->create();

        $file = UploadedFile::fake()->image('avatar.jpg', 300, 300);

        $this->actingAs($user)
            ->post(route('my-profile.photo.update'), [
                'photo' => $file,
            ])
            ->assertRedirect();

        $user->refresh();
        $this->assertNotNull($user->photo_url);
        $this->assertStringStartsWith('/uploads/avatars/', $user->photo_url);

        $uploadedPath = public_path(ltrim($user->photo_url, '/'));
        $this->assertFileExists($uploadedPath);

        $this->actingAs($user)
            ->delete(route('my-profile.photo.delete'))
            ->assertRedirect();

        $user->refresh();
        $this->assertNull($user->photo_url);
        $this->assertFileDoesNotExist($uploadedPath);
    }

    public function test_admin_can_generate_thr_without_cutoff_dates(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create([
            'join_date' => Carbon::parse('2024-01-01'),
            'base_salary' => 10_000_000,
            'fixed_allowance' => 2_000_000,
        ]);

        $employee = User::factory()->create();
        Employee::factory()->for($employee)->create([
            'join_date' => Carbon::parse('2025-11-01'),
            'base_salary' => 6_000_000,
            'fixed_allowance' => 0,
        ]);

        $this->actingAs($admin)
            ->post(route('payroll.generate'), [
                'period_name' => 'THR Idul Fitri 2026',
                'type' => 'thr',
                'period_month' => 5,
                'period_year' => 2026,
                'thr_reference_date' => '2026-05-01',
                'user_ids' => [$employee->id],
            ])
            ->assertRedirect();

        $payroll = Payroll::where('type', 'thr')->first();
        $this->assertNotNull($payroll);
        $this->assertEquals('2026-05-01', $payroll->thr_reference_date->toDateString());
        $this->assertEquals('2026-05-01', $payroll->start_date->toDateString());
        $this->assertEquals('2026-05-31', $payroll->end_date->toDateString());

        $item = $payroll->items()->where('user_id', $employee->id)->first();
        $this->assertNotNull($item);
        // 6 months tenure (Nov 1 2025 to May 1 2026) -> 6/12 * 6.000.000 = 3.000.000
        $this->assertEquals(3_000_000, (int) $item->thr_amount);
        $this->assertEquals(0, (int) $item->shortage_deduction);
    }

    public function test_employee_can_update_contact_and_password_on_my_profile(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('oldpassword123'),
            'phone' => '0811111111',
        ]);
        Employee::factory()->for($user)->create();

        $this->actingAs($user)
            ->patch(route('my-profile.contact.update'), [
                'phone' => '08199998888',
            ])
            ->assertRedirect();

        $user->refresh();
        $this->assertSame('08199998888', $user->phone);

        // Wrong current password should fail validation
        $this->actingAs($user)
            ->put(route('my-profile.password.update'), [
                'current_password' => 'wrongpass',
                'password' => 'newpassword123',
                'password_confirmation' => 'newpassword123',
            ])
            ->assertSessionHasErrors('current_password');

        // Valid current password updates password
        $this->actingAs($user)
            ->put(route('my-profile.password.update'), [
                'current_password' => 'oldpassword123',
                'password' => 'newpassword123',
                'password_confirmation' => 'newpassword123',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertTrue(Hash::check('newpassword123', $user->password));
    }

    public function test_admin_can_view_employees_directory_and_toggle_status(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $employee = User::factory()->create(['is_active' => true]);
        Employee::factory()->for($employee)->create();

        $this->actingAs($admin)
            ->get(route('employees.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Employees/Index')
                ->has('employees', 2)
                ->has('stats')
            );

        $this->actingAs($admin)
            ->patch(route('employees.toggle-status', $employee->id))
            ->assertRedirect();

        $employee->refresh();
        $this->assertFalse($employee->is_active);
    }

    public function test_notifications_are_loaded_from_database_and_persist_read_state(): void
    {
        $user = User::factory()->create();
        Employee::factory()->for($user)->create();

        ActivityLog::record(
            action: 'project.created',
            description: 'Proyek baru Villa Bali dibuat',
            user: $user,
        );

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('notifications', 1)
                ->where('notifications.0.title', 'Proyek baru Villa Bali dibuat')
                ->where('notifications.0.unread', true)
            );

        $this->actingAs($user)
            ->post(route('notifications.mark-read'))
            ->assertRedirect();

        $this->assertNotNull($user->fresh()->notifications_read_at);

        // After page refresh, unread stays false
        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('notifications', 1)
                ->where('notifications.0.unread', false)
            );
    }

    public function test_admin_can_upload_and_reset_company_logo_in_settings(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $file = UploadedFile::fake()->image('company.png', 400, 200);

        $this->actingAs($admin)
            ->post(route('settings.logo.update'), [
                'logo' => $file,
            ])
            ->assertRedirect();

        $setting = OfficeSetting::current();
        $this->assertNotNull($setting->company_logo_url);
        $this->assertStringStartsWith('/uploads/company/', $setting->company_logo_url);

        $uploadedPath = public_path(ltrim($setting->company_logo_url, '/'));
        $this->assertFileExists($uploadedPath);

        $this->actingAs($admin)
            ->get(route('settings.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('studio.logo_url', $setting->company_logo_url)
            );

        $this->actingAs($admin)
            ->delete(route('settings.logo.delete'))
            ->assertRedirect();

        $this->assertNull($setting->fresh()->company_logo_url);
        $this->assertFileDoesNotExist($uploadedPath);
    }

    public function test_admin_can_permanently_delete_resigned_employee(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $resigned = User::factory()->create(['name' => 'Karyawan Resign']);
        Employee::factory()->for($resigned)->create();

        $project = Project::factory()->create(['owner_id' => $resigned->id]);
        $payroll = Payroll::create([
            'period_name' => 'Oktober 2026',
            'type' => 'regular',
            'period_month' => 10,
            'period_year' => 2026,
            'start_date' => Carbon::parse('2026-10-01'),
            'end_date' => Carbon::parse('2026-10-31'),
            'status' => 'finalized',
            'generated_by' => $resigned->id,
            'total_amount' => 5_000_000,
        ]);
        PayrollItem::create([
            'payroll_id' => $payroll->id,
            'user_id' => $resigned->id,
            'base_salary' => 5_000_000,
            'net_salary' => 5_000_000,
        ]);

        // Cannot delete self
        $this->actingAs($admin)
            ->delete(route('employees.destroy', $admin->id))
            ->assertRedirect(route('employees.index'));
        $this->assertDatabaseHas('users', ['id' => $admin->id]);

        // Can delete resigned employee cleanly
        $this->actingAs($admin)
            ->delete(route('employees.destroy', $resigned->id))
            ->assertRedirect(route('employees.index'));

        $this->assertDatabaseMissing('users', ['id' => $resigned->id]);
        $this->assertDatabaseMissing('employees', ['user_id' => $resigned->id]);
        $this->assertSame($admin->id, $project->fresh()->owner_id);
        $this->assertSame($admin->id, $payroll->fresh()->generated_by);
    }
}
