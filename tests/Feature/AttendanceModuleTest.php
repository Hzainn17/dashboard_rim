<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\OfficeSetting;
use App\Models\Overtime;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AttendanceModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_can_check_in_and_check_out_with_shortage_calculation(): void
    {
        OfficeSetting::current();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/attendance/check-in', [
                'mode' => 'office',
                'distance_meters' => 35,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $user->id,
            'mode' => 'office',
            'status' => 'hadir',
        ]);

        $this->actingAs($user)
            ->post('/attendance/check-out', [
                'simulated_minutes' => 480,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $user->id,
            'actual_work_minutes' => 480,
            'shortage_minutes' => 60,
            'status' => 'kurang_jam',
        ]);

        // Re-check-in on the same day should update existing row without UniqueConstraintViolationException
        $this->actingAs($user)
            ->post('/attendance/check-in', [
                'mode' => 'office',
                'distance_meters' => 30,
            ])
            ->assertRedirect();

        $this->assertSame(1, Attendance::query()->where('user_id', $user->id)->count());
    }

    public function test_check_in_is_blocked_when_day_is_auto_locked_ganti_hari(): void
    {
        $user = User::factory()->create();

        Attendance::query()->create([
            'user_id' => $user->id,
            'date' => Carbon::today()->format('Y-m-d'),
            'mode' => 'office',
            'target_work_minutes' => 0,
            'shortage_minutes' => 0,
            'status' => 'ganti_hari',
            'notes' => 'Libur pengganti kerja akhir pekan',
        ]);

        $this->actingAs($user)
            ->post('/attendance/check-in', [
                'mode' => 'office',
                'distance_meters' => 25,
            ])
            ->assertSessionHas('error');
    }

    public function test_admin_approving_weekend_day_off_exchange_auto_locks_selected_weekday(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();
        $exchangeDate = Carbon::today()->addDays(4)->format('Y-m-d');

        $weekendAttendance = Attendance::query()->create([
            'user_id' => $employee->id,
            'date' => Carbon::yesterday()->format('Y-m-d'),
            'mode' => 'office',
            'is_weekend' => true,
            'compensation_type' => 'day_off_exchange',
            'exchange_date' => $exchangeDate,
            'compensation_status' => 'pending',
            'check_in_at' => Carbon::yesterday()->setTime(9, 0),
            'check_out_at' => Carbon::yesterday()->setTime(17, 0),
            'target_work_minutes' => 540,
            'actual_work_minutes' => 480,
            'shortage_minutes' => 0,
            'status' => 'hadir',
        ]);

        $this->actingAs($admin)
            ->patch("/attendance/approvals/site-visit/{$weekendAttendance->id}", [
                'action' => 'approve',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $employee->id,
            'date' => $exchangeDate.' 00:00:00',
            'status' => 'ganti_hari',
            'target_work_minutes' => 0,
        ]);
    }

    public function test_employee_can_start_and_stop_overtime_and_admin_can_approve(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();
        $project = Project::factory()->create(['owner_id' => $admin->id]);

        $this->actingAs($employee)
            ->post('/attendance/overtime/start', [
                'project_id' => $project->id,
                'task_description' => 'Revisi gambar denah lantai 2',
            ])
            ->assertRedirect();

        $overtime = Overtime::query()->where('user_id', $employee->id)->firstOrFail();
        $this->assertSame('active', $overtime->status);

        $this->actingAs($employee)
            ->post("/attendance/overtime/{$overtime->id}/stop", [
                'duration_minutes' => 120,
            ])
            ->assertRedirect();

        $this->assertSame('pending', $overtime->fresh()->status);

        $this->actingAs($admin)
            ->patch("/attendance/approvals/overtime/{$overtime->id}", [
                'action' => 'approve',
            ])
            ->assertRedirect();

        $this->assertSame('approved', $overtime->fresh()->status);
    }

    public function test_admin_can_view_approvals_and_monitoring_pages(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get('/attendance/approvals')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Attendance/Approvals')
                ->has('siteVisits')
                ->has('leaveRequests')
                ->has('overtimes')
                ->has('counts')
            );

        $this->actingAs($admin)
            ->get('/attendance/monitoring')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Attendance/Monitoring')
                ->has('todayTracker')
                ->has('monthlyRecap')
                ->has('recentLogs')
                ->has('overtimeLogs')
            );
    }

    public function test_admin_can_manually_input_or_adjust_overtime_in_monitoring(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();
        $project = Project::factory()->create(['owner_id' => $admin->id]);

        $this->actingAs($admin)
            ->post('/attendance/monitoring/adjust', [
                'adjust_type' => 'overtime',
                'user_id' => $employee->id,
                'date' => Carbon::today()->format('Y-m-d'),
                'project_id' => $project->id,
                'start_time' => '19:00',
                'duration_minutes' => 180,
                'status' => 'approved',
                'task_description' => 'Lembur render interior untuk presentasi klien',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('overtimes', [
            'user_id' => $employee->id,
            'project_id' => $project->id,
            'source' => 'manual',
            'duration_minutes' => 180,
            'status' => 'approved',
        ]);
    }
}
