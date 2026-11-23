<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Employee;
use App\Models\Overtime;
use App\Models\Payroll;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EndToEndWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_complete_studio_rim_end_to_end_lifecycle(): void
    {
        $workDate = Carbon::parse('2026-11-18 08:00:00');
        $this->travelTo($workDate);

        // 1. Super Admin configures Studio GPS & Overtime settings
        $admin = User::factory()->superAdmin()->create(['name' => 'Principal Admin']);
        Employee::factory()->for($admin)->create();

        $this->actingAs($admin)
            ->put(route('settings.update'), [
                'office_name' => 'RIM Studio Jakarta',
                'latitude' => -6.200000,
                'longitude' => 106.816666,
                'radius_meters' => 150,
                'standard_work_hours' => 9,
                'overtime_cooldown_minutes' => 60,
                'overtime_rate_per_hour' => 40_000,
            ])
            ->assertRedirect();

        // 2. Admin registers a new Employee
        $this->actingAs($admin)
            ->post(route('employees.store'), [
                'name' => 'Andi Pratama',
                'email' => 'andi@rimstudio.id',
                'password' => 'initial123',
                'phone' => '081200001111',
                'role' => UserRole::Employee->value,
                'employee_code' => 'RIM-088',
                'position' => 'Senior Architect',
                'department' => 'Desain',
                'join_date' => '2025-01-10',
                'employment_status' => 'tetap',
                'annual_leave_quota' => 12,
                'base_salary' => 10_000_000,
                'fixed_allowance' => 1_000_000,
                'overtime_rate_per_hour' => 50_000,
                'bank_name' => 'BNI',
                'bank_account_number' => '1122334455',
                'bank_account_holder' => 'Andi Pratama',
            ])
            ->assertRedirect(route('employees.index'));

        $employee = User::where('email', 'andi@rimstudio.id')->firstOrFail();

        // 3. Employee updates contact & changes password on MyProfile
        $this->actingAs($employee)
            ->patch(route('my-profile.contact.update'), ['phone' => '081299997777'])
            ->assertRedirect();

        $this->actingAs($employee)
            ->put(route('my-profile.password.update'), [
                'current_password' => 'initial123',
                'password' => 'andiSecure99',
                'password_confirmation' => 'andiSecure99',
            ])
            ->assertRedirect();

        $this->assertTrue(Hash::check('andiSecure99', $employee->fresh()->password));

        // 4. Admin creates Project with Employee & Kanban Task, plus Calendar event
        $this->actingAs($admin)
            ->post(route('projects.store'), [
                'name' => 'Villa Ubud Phase 2',
                'client_name' => 'Pak Hendra',
                'category' => 'Residensial',
                'status' => 'ongoing',
                'start_date' => '2026-11-01',
                'due_date' => '2026-12-20',
                'member_ids' => [$employee->id],
            ])
            ->assertRedirect();

        $project = Project::where('name', 'Villa Ubud Phase 2')->firstOrFail();

        $this->actingAs($admin)
            ->post(route('projects.tasks.store', $project->id), [
                'title' => 'Gambar Kerja Denah Lt. 1',
                'assignee_id' => $employee->id,
                'priority' => 'high',
                'status' => 'todo',
            ])
            ->assertRedirect();

        $task = ProjectTask::where('project_id', $project->id)->firstOrFail();

        // Employee completes Kanban task -> project progress becomes 100%
        $this->actingAs($employee)
            ->patch(route('projects.tasks.update-status', [$project->id, $task->id]), [
                'status' => 'done',
            ])
            ->assertRedirect();

        $this->assertSame(100, $project->fresh()->progress_percent);

        $this->actingAs($admin)
            ->post(route('calendar.events.store'), [
                'title' => 'Asistensi Klien Villa Ubud',
                'event_date' => '2026-11-18',
                'start_time' => '10:00',
                'category' => 'meeting',
                'project_id' => $project->id,
            ])
            ->assertRedirect();

        // 5. Employee checks in via GPS, checks out after 9h, waits 1h cooldown, and logs 2h Overtime
        $this->actingAs($employee)
            ->post(route('attendance.check-in'), [
                'mode' => 'office',
                'latitude' => -6.200010,
                'longitude' => 106.816670,
            ])
            ->assertRedirect();

        $this->travelTo($workDate->copy()->addHours(9)); // 17:00
        $this->actingAs($employee)
            ->post(route('attendance.check-out'), [
                'latitude' => -6.200010,
                'longitude' => 106.816670,
            ])
            ->assertRedirect();

        $this->travelTo($workDate->copy()->addHours(10)); // 18:00 (cooldown passed)
        $this->actingAs($employee)
            ->post(route('attendance.overtime.start'), [
                'project_id' => $project->id,
                'task_description' => 'Revisi detail fasad',
            ])
            ->assertRedirect();

        $overtime = Overtime::where('user_id', $employee->id)->firstOrFail();

        $this->travelTo($workDate->copy()->addHours(12)); // 20:00 (2h overtime)
        $this->actingAs($employee)
            ->post(route('attendance.overtime.stop', $overtime->id))
            ->assertRedirect();

        // 6. Admin approves Overtime
        $this->actingAs($admin)
            ->patch(route('attendance.approvals.overtime', $overtime->id), [
                'action' => 'approve',
            ])
            ->assertRedirect();

        // 7. Admin generates Payroll, finalizes, marks paid, and exports BNI & BCA CSVs
        $this->actingAs($admin)
            ->post(route('payroll.generate'), [
                'period_name' => 'November 2026',
                'type' => 'regular',
                'period_month' => 11,
                'period_year' => 2026,
                'start_date' => '2026-11-01',
                'end_date' => '2026-11-30',
                'user_ids' => [$employee->id],
            ])
            ->assertRedirect();

        $payroll = Payroll::where('period_month', 11)->where('period_year', 2026)->firstOrFail();
        $item = $payroll->items()->where('user_id', $employee->id)->firstOrFail();

        // Base 10M + Fixed 1M + 2h * 50k (100k) = 11.1M, shortage_deduction = 0
        $this->assertEquals(0, (int) $item->shortage_deduction);
        $this->assertEquals(100_000, (int) $item->overtime_amount);
        $this->assertEquals(11_100_000, (int) $item->net_salary);

        $this->actingAs($admin)
            ->patch(route('payroll.finalize', $payroll->id))
            ->assertRedirect();

        $this->actingAs($admin)
            ->patch(route('payroll.mark-paid', $payroll->id))
            ->assertRedirect();

        $bniCsv = $this->actingAs($admin)
            ->get(route('payroll.export-bank', ['payroll' => $payroll->id, 'bank' => 'bni']))
            ->assertOk();
        $this->assertStringContainsString('1122334455', $bniCsv->streamedContent());

        $bcaCsv = $this->actingAs($admin)
            ->get(route('payroll.export-bank', ['payroll' => $payroll->id, 'bank' => 'bca']))
            ->assertOk();
        $this->assertStringContainsString('Andi Pratama', $bcaCsv->streamedContent());

        // 8. Employee checks MyProfile (KPI + Private Slip) & opens printable slip
        $this->actingAs($employee)
            ->get(route('my-profile.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/MyProfile')
                ->where('kpi.present_days_month', 1)
                ->where('kpi.active_projects_count', 1)
                ->where('kpi.done_tasks', 1)
                ->where('kpi.overtime_hours_month', 2)
                ->has('slips', 1)
                ->where('slips.0.net_salary', 11_100_000)
                ->where('slips.0.status', 'paid')
            );

        $this->actingAs($employee)
            ->get(route('payroll.slip', $item->id))
            ->assertOk()
            ->assertSee('Andi Pratama')
            ->assertSee('November 2026');
    }
}
