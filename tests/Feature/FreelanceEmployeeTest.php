<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\DailyTask;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FreelanceEmployeeTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_create_freelance_drafter_and_monitor_their_daily_tasks_without_attendance_or_payroll(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $regularStaff = User::factory()->create(['name' => 'Arsitek Tetap']);
        Employee::factory()->create([
            'user_id' => $regularStaff->id,
            'employment_status' => 'tetap',
            'position' => 'Arsitek',
            'department' => 'Perencanaan',
        ]);

        // 1. Create a Freelance Drafter via EmployeeController
        $this->actingAs($superAdmin)
            ->post(route('employees.store'), [
                'name' => 'Raka Drafter Freelance',
                'email' => 'raka.freelance@rimprojects.id',
                'password' => 'password123',
                'role' => UserRole::Employee->value,
                'employee_code' => 'RIM-FL01',
                'position' => 'Drafter',
                'department' => 'Perencanaan',
                'work_type' => 'kantor',
                'join_date' => '2026-11-25',
                'employment_status' => 'freelance',
                'annual_leave_quota' => 0,
                'base_salary' => 0,
                'fixed_allowance' => 0,
                'overtime_rate_per_hour' => 0,
            ])
            ->assertRedirect();

        $freelancer = User::query()->where('email', 'raka.freelance@rimprojects.id')->firstOrFail();
        $this->assertTrue($freelancer->isFreelancer());

        // Freelancer cannot access /attendance page and is redirected to dashboard
        $this->actingAs($freelancer)
            ->get(route('attendance.index'))
            ->assertRedirect(route('dashboard'));

        // 2. Freelancer is excluded from Dashboard total_employees & Attendance Monitoring
        $this->actingAs($superAdmin)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('metrics.total_employees', 1));

        $this->actingAs($superAdmin)
            ->get(route('attendance.monitoring'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('employees', 2)); // SuperAdmin + regularStaff (freelancer excluded)

        // 3. Freelancer is skipped during Monthly Payroll generation
        $this->actingAs($superAdmin)
            ->post(route('payroll.generate'), [
                'period_name' => 'Payroll November 2026',
                'type' => 'regular',
                'period_month' => 11,
                'period_year' => 2026,
                'start_date' => '2026-11-01',
                'end_date' => '2026-11-30',
            ])
            ->assertRedirect();

        $payroll = Payroll::query()->firstOrFail();
        $this->assertDatabaseHas('payroll_items', [
            'payroll_id' => $payroll->id,
            'user_id' => $regularStaff->id,
        ]);
        $this->assertDatabaseMissing('payroll_items', [
            'payroll_id' => $payroll->id,
            'user_id' => $freelancer->id,
        ]);

        // 4. Freelancer logs Daily Tasks on their assigned project & Super Admin sees them with 'Freelance' badge
        $project = Project::factory()->create([
            'owner_id' => $superAdmin->id,
            'name' => 'Rumah Minimalis Pak Agung',
        ]);
        $project->members()->sync([$freelancer->id => ['role_in_project' => 'Drafter']]);

        DailyTask::query()->create([
            'user_id' => $freelancer->id,
            'project_id' => $project->id,
            'work_date' => Carbon::today()->format('Y-m-d'),
            'title' => 'Gambar denah lantai 2 & potongan A-A',
            'status' => 'in_progress',
        ]);

        $this->actingAs($superAdmin)
            ->get(route('daily-tasks.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('teamBoard', 2)
                ->where('teamBoard.1.name', 'Raka Drafter Freelance')
                ->where('teamBoard.1.presence_status', 'freelance')
                ->where('teamBoard.1.presence_label', 'Freelance')
                ->where('teamBoard.1.tasks.0.title', 'Gambar denah lantai 2 & potongan A-A'));
    }
}
