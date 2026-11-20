<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\OfficeSetting;
use App\Models\Overtime;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
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

    public function test_employee_can_request_check_in_adjustment_and_admin_can_approve(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();

        // Employee checked in at 09:15 but arrived at 08:00
        $attendance = Attendance::query()->create([
            'user_id' => $employee->id,
            'date' => Carbon::today()->format('Y-m-d'),
            'mode' => 'office',
            'check_in_at' => Carbon::today()->setTime(9, 15),
            'target_work_minutes' => 540,
            'status' => 'hadir',
        ]);

        $this->actingAs($employee)
            ->post('/attendance/adjustment', [
                'adjustment_type' => 'check_in',
                'date' => Carbon::today()->format('Y-m-d'),
                'adjusted_check_in_time' => '08:00',
                'notes' => 'Sudah standby sejak jam 8 pagi, koordinasi denah dengan Lead',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'id' => $attendance->id,
            'adjustment_type' => 'check_in',
            'adjustment_status' => 'pending',
            'adjustment_reason' => 'Sudah standby sejak jam 8 pagi, koordinasi denah dengan Lead',
        ]);

        $this->actingAs($admin)
            ->patch("/attendance/approvals/adjustment/{$attendance->id}", [
                'action' => 'approve',
            ])
            ->assertRedirect();

        $updated = $attendance->fresh();
        $this->assertSame('approved', $updated->adjustment_status);
        $this->assertSame('08:00', $updated->check_in_at->format('H:i'));
    }

    public function test_employee_can_confirm_checkout_for_past_unclosed_attendance(): void
    {
        $employee = User::factory()->create();
        $yesterday = Carbon::yesterday();

        $unclosed = Attendance::query()->create([
            'user_id' => $employee->id,
            'date' => $yesterday->format('Y-m-d'),
            'mode' => 'office',
            'check_in_at' => $yesterday->copy()->setTime(8, 30),
            'check_out_at' => null,
            'target_work_minutes' => 540,
            'status' => 'hadir',
            'is_auto_closed' => true,
        ]);

        $this->actingAs($employee)
            ->post('/attendance/confirm-checkout', [
                'attendance_id' => $unclosed->id,
                'check_out_time' => '17:30',
                'notes' => 'Lupa checkout langsung pulang kemarin',
            ])
            ->assertRedirect();

        $refreshed = $unclosed->fresh();
        $this->assertNotNull($refreshed->check_out_at);
        $this->assertSame('17:30', $refreshed->check_out_at->format('H:i'));
        $this->assertSame(540, $refreshed->actual_work_minutes);
        $this->assertSame(0, $refreshed->shortage_minutes);
        $this->assertSame('hadir', $refreshed->status);
        $this->assertFalse($refreshed->is_auto_closed);
    }

    public function test_attendance_auto_close_command_closes_unclosed_sessions_and_marks_for_confirmation(): void
    {
        $employee = User::factory()->create();
        $yesterday = Carbon::yesterday();

        $unclosed = Attendance::query()->create([
            'user_id' => $employee->id,
            'date' => $yesterday->format('Y-m-d'),
            'mode' => 'office',
            'check_in_at' => $yesterday->copy()->setTime(8, 0),
            'check_out_at' => null,
            'target_work_minutes' => 540,
            'status' => 'hadir',
            'is_auto_closed' => false,
        ]);

        $this->artisan('attendance:auto-close')->assertSuccessful();

        $refreshed = $unclosed->fresh();
        $this->assertTrue($refreshed->is_auto_closed);
        $this->assertNotNull($refreshed->check_out_at);
        $this->assertSame('17:00', $refreshed->check_out_at->format('H:i'));
        $this->assertSame(540, $refreshed->actual_work_minutes);
        $this->assertSame(0, $refreshed->shortage_minutes);

        // Employee sees unclosedPastAttendance in Inertia shared props on dashboard
        $this->actingAs($employee)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.unclosedPastAttendance.id', $unclosed->id)
            );
    }

    public function test_employee_can_split_checkout_and_immediately_start_overtime(): void
    {
        $this->travelTo(Carbon::today()->setTime(19, 0));

        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();
        $project = Project::factory()->create(['owner_id' => $admin->id]);

        // Employee checked in at 08:00 (11 hours ago)
        $attendance = Attendance::query()->create([
            'user_id' => $employee->id,
            'date' => Carbon::today()->format('Y-m-d'),
            'mode' => 'office',
            'check_in_at' => Carbon::today()->setTime(8, 0),
            'target_work_minutes' => 540,
            'status' => 'hadir',
        ]);

        $this->actingAs($employee)
            ->post('/attendance/checkout-and-overtime', [
                'project_id' => $project->id,
                'task_description' => 'Lembur asistensi gambar tender malam',
            ])
            ->assertRedirect();

        $refreshedAtt = $attendance->fresh();
        $this->assertNotNull($refreshedAtt->check_out_at);
        // Regular work should be capped at exact 9 hours (17:00)
        $this->assertSame('17:00', $refreshedAtt->check_out_at->format('H:i'));
        $this->assertSame(540, $refreshedAtt->actual_work_minutes);
        $this->assertSame(0, $refreshedAtt->shortage_minutes);
        $this->assertSame('hadir', $refreshedAtt->status);

        // Active overtime session should be created immediately
        $overtime = Overtime::query()->where('user_id', $employee->id)->where('status', 'active')->first();
        $this->assertNotNull($overtime);
        $this->assertSame($project->id, $overtime->project_id);
        $this->assertSame('Lembur asistensi gambar tender malam', $overtime->task_description);
    }

    public function test_employee_cannot_start_overtime_twice_in_same_day(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();
        $project = Project::factory()->create(['owner_id' => $admin->id]);

        Overtime::query()->create([
            'user_id' => $employee->id,
            'project_id' => $project->id,
            'source' => 'regular',
            'start_at' => Carbon::today()->setTime(19, 0),
            'end_at' => Carbon::today()->setTime(20, 0),
            'duration_minutes' => 60,
            'task_description' => 'Sesi lembur pertama',
            'status' => 'pending',
        ]);

        $this->actingAs($employee)
            ->post('/attendance/overtime/start', [
                'project_id' => $project->id,
                'task_description' => 'Mencoba lembur kedua hari yang sama',
            ])
            ->assertSessionHas('error');

        $this->assertSame(1, Overtime::query()->where('user_id', $employee->id)->count());
    }

    public function test_employee_cannot_start_overtime_when_on_leave_today(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();
        $project = Project::factory()->create(['owner_id' => $admin->id]);

        $this->actingAs($employee)
            ->post('/attendance/leave-requests', [
                'type' => 'izin',
                'start_date' => Carbon::today()->format('Y-m-d'),
                'end_date' => Carbon::today()->format('Y-m-d'),
                'reason' => 'Keperluan keluarga mendadak',
            ])
            ->assertRedirect();

        $leave = LeaveRequest::query()->where('user_id', $employee->id)->firstOrFail();

        $this->actingAs($admin)
            ->patch("/attendance/approvals/leave/{$leave->id}", [
                'action' => 'approve',
            ])
            ->assertRedirect();

        $leave = LeaveRequest::query()->where('user_id', $employee->id)->firstOrFail();

        $this->actingAs($admin)
            ->patch("/attendance/approvals/leave/{$leave->id}", [
                'action' => 'approve',
            ])
            ->assertRedirect();

        $this->actingAs($employee)
            ->post('/attendance/overtime/start', [
                'project_id' => $project->id,
                'task_description' => 'Coba lembur saat izin hari ini',
            ])
            ->assertSessionHas('error');

        $this->assertSame(0, Overtime::query()->where('user_id', $employee->id)->count());
    }

    public function test_weekend_simulation_toggle_records_weekend_compensation_on_weekday(): void
    {
        OfficeSetting::current();
        $employee = User::factory()->create();
        $exchangeDate = Carbon::today()->addDays(3)->format('Y-m-d');

        $this->actingAs($employee)
            ->post('/attendance/check-in', [
                'mode' => 'office',
                'distance_meters' => 25,
                'is_weekend' => true,
                'compensation_type' => 'day_off_exchange',
                'exchange_date' => $exchangeDate,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $employee->id,
            'is_weekend' => true,
            'compensation_type' => 'day_off_exchange',
            'compensation_status' => 'pending',
        ]);
    }

    public function test_site_visit_requires_photo_and_project_while_notes_are_optional(): void
    {
        OfficeSetting::current();
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();
        $project = Project::factory()->create(['owner_id' => $admin->id]);

        // Missing photo and project -> validation errors
        $this->actingAs($employee)
            ->post('/attendance/check-in', [
                'mode' => 'site_visit',
            ])
            ->assertSessionHasErrors(['site_visit_project_id', 'site_visit_photo']);

        // Project + photo without notes -> succeeds and stores photo URL
        $photo = UploadedFile::fake()->image('site.jpg', 640, 480);

        $this->actingAs($employee)
            ->post('/attendance/check-in', [
                'mode' => 'site_visit',
                'site_visit_project_id' => $project->id,
                'site_visit_photo' => $photo,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $att = Attendance::query()->where('user_id', $employee->id)->firstOrFail();
        $this->assertSame('site_visit', $att->mode);
        $this->assertSame($project->id, $att->site_visit_project_id);
        $this->assertNull($att->notes);
        $this->assertNotNull($att->site_visit_photo_url);
        $this->assertFileExists(public_path(ltrim($att->site_visit_photo_url, '/')));
    }

    public function test_office_overtime_blocks_outside_radius_while_site_visit_overtime_is_allowed(): void
    {
        $setting = OfficeSetting::current();
        $setting->update([
            'latitude' => -6.200000,
            'longitude' => 106.816666,
            'radius_meters' => 100,
        ]);

        $admin = User::factory()->admin()->create();
        $project = Project::factory()->create(['owner_id' => $admin->id]);

        // 1. Office mode employee outside radius -> blocked
        $officeEmp = User::factory()->create();
        Attendance::query()->create([
            'user_id' => $officeEmp->id,
            'date' => Carbon::today()->format('Y-m-d'),
            'mode' => 'office',
            'check_in_at' => Carbon::today()->setTime(8, 0),
            'check_out_at' => Carbon::today()->setTime(17, 0),
            'target_work_minutes' => 540,
            'actual_work_minutes' => 540,
            'status' => 'hadir',
        ]);

        $this->actingAs($officeEmp)
            ->post('/attendance/overtime/start', [
                'project_id' => $project->id,
                'task_description' => 'Coba lembur dari rumah',
                'latitude' => -6.250000,
                'longitude' => 106.850000,
            ])
            ->assertSessionHas('error');

        $this->assertSame(0, Overtime::query()->where('user_id', $officeEmp->id)->count());

        // 2. Site visit employee outside office radius -> allowed (pending admin approval)
        $siteEmp = User::factory()->create();
        Attendance::query()->create([
            'user_id' => $siteEmp->id,
            'date' => Carbon::today()->format('Y-m-d'),
            'mode' => 'site_visit',
            'site_visit_project_id' => $project->id,
            'check_in_at' => Carbon::today()->setTime(8, 0),
            'check_out_at' => Carbon::today()->setTime(17, 0),
            'target_work_minutes' => 540,
            'actual_work_minutes' => 540,
            'status' => 'site_visit',
        ]);

        $this->actingAs($siteEmp)
            ->post('/attendance/overtime/start', [
                'project_id' => $project->id,
                'task_description' => 'Lembur pengawasan cor lapangan',
                'latitude' => -6.250000,
                'longitude' => 106.850000,
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame(1, Overtime::query()->where('user_id', $siteEmp->id)->count());
    }

    public function test_field_employee_only_sees_construction_projects_for_site_visit(): void
    {
        OfficeSetting::current();
        $fieldEmployee = User::factory()->create();
        Employee::factory()->field()->create(['user_id' => $fieldEmployee->id]);
        $officeEmployee = User::factory()->create();
        Employee::factory()->create(['user_id' => $officeEmployee->id]);

        $planningProject = Project::factory()->create();
        $constructionProject = Project::factory()->construction()->create();
        Project::factory()->construction()->create(['status' => 'done']);

        $this->actingAs($fieldEmployee)
            ->get('/attendance')
            ->assertInertia(fn (Assert $page) => $page
                ->has('siteVisitProjects', 1)
                ->where('siteVisitProjects.0.id', $constructionProject->id)
                ->where('siteVisitProjects.0.group', 'lapangan')
                ->where('auth.workType', 'lapangan'));

        $this->actingAs($officeEmployee)
            ->get('/attendance')
            ->assertInertia(fn (Assert $page) => $page
                ->has('siteVisitProjects', 2)
                ->where('siteVisitProjects.0.id', $constructionProject->id)
                ->where('siteVisitProjects.1.id', $planningProject->id)
                ->where('siteVisitProjects.1.group', 'perencanaan'));
    }

    public function test_field_employee_cannot_site_visit_a_planning_only_project(): void
    {
        OfficeSetting::current();
        $fieldEmployee = User::factory()->create();
        Employee::factory()->field()->create(['user_id' => $fieldEmployee->id]);
        $planningProject = Project::factory()->create();
        $constructionProject = Project::factory()->construction()->create();

        $this->actingAs($fieldEmployee)
            ->post('/attendance/check-in', [
                'mode' => 'site_visit',
                'site_visit_project_id' => $planningProject->id,
                'site_visit_photo' => UploadedFile::fake()->image('site.jpg'),
            ])
            ->assertSessionHas('error');

        $this->assertDatabaseMissing('attendances', ['user_id' => $fieldEmployee->id]);

        $this->actingAs($fieldEmployee)
            ->post('/attendance/check-in', [
                'mode' => 'site_visit',
                'site_visit_project_id' => $constructionProject->id,
                'site_visit_photo' => UploadedFile::fake()->image('site.jpg'),
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $fieldEmployee->id,
            'site_visit_project_id' => $constructionProject->id,
        ]);
    }
}
