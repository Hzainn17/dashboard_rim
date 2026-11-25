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
        Carbon::setTestNow(Carbon::parse('2026-11-20 08:00:00'));
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
                'distance_meters' => 35,
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
        Carbon::setTestNow();
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
        $admin = User::factory()->superAdmin()->create();
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
        $admin = User::factory()->superAdmin()->create();
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
        $admin = User::factory()->superAdmin()->create();

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
        $admin = User::factory()->superAdmin()->create();
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
        $admin = User::factory()->superAdmin()->create();
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
        $admin = User::factory()->superAdmin()->create();
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

    public function test_weekend_compensation_is_strictly_determined_by_calendar_day_and_work_type(): void
    {
        OfficeSetting::current();

        // 1. Wednesday (weekday): office worker cannot spoof is_weekend=true
        Carbon::setTestNow(Carbon::parse('2026-11-18 08:05:00')); // Wednesday
        $officeWorker = User::factory()->create();
        $officeWorker->employee()->create([
            'employee_code' => 'RIM-OFF-1',
            'position' => 'Arsitek',
            'department' => 'Perencanaan',
            'work_type' => 'kantor',
            'join_date' => '2026-01-01',
            'base_salary' => 8_000_000,
        ]);

        $this->actingAs($officeWorker)
            ->post('/attendance/check-in', [
                'mode' => 'office',
                'distance_meters' => 25,
                'is_weekend' => true,
                'compensation_type' => 'day_off_exchange',
                'exchange_date' => '2026-11-23',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $officeWorker->id,
            'is_weekend' => false,
            'compensation_type' => 'none',
            'compensation_status' => 'none',
        ]);

        // 2. Saturday: office worker IS off-day, field worker IS regular workday
        Carbon::setTestNow(Carbon::parse('2026-11-21 08:05:00')); // Saturday
        $officeWorker2 = User::factory()->create();
        $officeWorker2->employee()->create([
            'employee_code' => 'RIM-OFF-2',
            'position' => 'Drafter',
            'department' => 'Perencanaan',
            'work_type' => 'kantor',
            'join_date' => '2026-01-01',
            'base_salary' => 6_000_000,
        ]);

        $this->actingAs($officeWorker2)
            ->post('/attendance/check-in', [
                'mode' => 'office',
                'distance_meters' => 25,
                'compensation_type' => 'day_off_exchange',
                'exchange_date' => '2026-11-25',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $officeWorker2->id,
            'is_weekend' => true,
            'compensation_type' => 'day_off_exchange',
            'compensation_status' => 'pending',
        ]);

        $fieldWorker = User::factory()->create();
        $fieldWorker->employee()->create([
            'employee_code' => 'RIM-FLD-1',
            'position' => 'Site Supervisor',
            'department' => 'Pembangunan',
            'work_type' => 'lapangan',
            'join_date' => '2026-01-01',
            'base_salary' => 7_000_000,
        ]);

        $this->actingAs($fieldWorker)
            ->post('/attendance/check-in', [
                'mode' => 'office',
                'distance_meters' => 25,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $fieldWorker->id,
            'is_weekend' => false,
            'compensation_type' => 'none',
        ]);

        // 3. Sunday: field worker IS off-day
        Carbon::setTestNow(Carbon::parse('2026-11-22 08:05:00')); // Sunday
        $this->actingAs($fieldWorker)
            ->post('/attendance/check-in', [
                'mode' => 'office',
                'distance_meters' => 25,
                'compensation_type' => 'overtime',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $fieldWorker->id,
            'date' => '2026-11-22 00:00:00',
            'is_weekend' => true,
            'compensation_type' => 'overtime',
            'compensation_status' => 'pending',
        ]);

        Carbon::setTestNow();
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
                ->has('projects', 1)
                ->where('projects.0.id', $constructionProject->id)
                ->where('auth.workType', 'lapangan'));

        $this->actingAs($officeEmployee)
            ->get('/attendance')
            ->assertInertia(fn (Assert $page) => $page
                ->has('siteVisitProjects', 2)
                ->where('siteVisitProjects.0.id', $constructionProject->id)
                ->where('siteVisitProjects.1.id', $planningProject->id)
                ->where('siteVisitProjects.1.group', 'perencanaan')
                ->has('projects', 1)
                ->where('projects.0.id', $planningProject->id));
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

    public function test_field_employee_has_8_hour_target_and_saturday_is_a_working_day(): void
    {
        OfficeSetting::current();
        $fieldEmployee = User::factory()->create();
        Employee::factory()->field()->create(['user_id' => $fieldEmployee->id]);
        $officeEmployee = User::factory()->create();
        Employee::factory()->create(['user_id' => $officeEmployee->id]);
        $constructionProject = Project::factory()->construction()->create();

        // Saturday: working day for field worker (8 hours = 480m), weekend for office worker (9 hours = 540m)
        Carbon::setTestNow(Carbon::parse('2026-11-21 08:00:00'));

        $this->actingAs($fieldEmployee)
            ->get('/attendance')
            ->assertInertia(fn (Assert $page) => $page
                ->where('isWeekendToday', false)
                ->where('officeSetting.standard_work_hours', 8)
                ->where('auth.targetWorkHours', 8)
                ->where('auth.targetWorkMinutes', 480));

        $this->actingAs($fieldEmployee)
            ->post('/attendance/check-in', [
                'mode' => 'site_visit',
                'site_visit_project_id' => $constructionProject->id,
                'site_visit_photo' => UploadedFile::fake()->image('site.jpg'),
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $fieldEmployee->id,
            'target_work_minutes' => 480,
            'is_weekend' => false,
        ]);

        // Field worker checks out after 8 hours -> zero shortage
        $this->actingAs($fieldEmployee)
            ->post('/attendance/check-out', ['simulated_minutes' => 480])
            ->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'user_id' => $fieldEmployee->id,
            'actual_work_minutes' => 480,
            'shortage_minutes' => 0,
        ]);

        // Office worker on Saturday is treated as weekend
        $this->actingAs($officeEmployee)
            ->get('/attendance')
            ->assertInertia(fn (Assert $page) => $page
                ->where('isWeekendToday', true)
                ->where('officeSetting.standard_work_hours', 9));

        // Sunday is off-day for field worker too
        Carbon::setTestNow(Carbon::parse('2026-11-22 08:00:00'));

        $this->actingAs($fieldEmployee)
            ->get('/attendance')
            ->assertInertia(fn (Assert $page) => $page
                ->where('isWeekendToday', true));

        Carbon::setTestNow();
    }

    public function test_office_checkout_requires_office_gps_radius_unless_site_visit_photo_proof_is_submitted(): void
    {
        OfficeSetting::query()->updateOrCreate([], [
            'office_name' => 'RIM Studio',
            'latitude' => -6.1753924,
            'longitude' => 106.8271528,
            'radius_meters' => 100,
        ]);

        $superAdmin = User::factory()->superAdmin()->create();
        $employee = User::factory()->create();
        $project = Project::factory()->create(['owner_id' => $superAdmin->id]);

        // Employee checks in at office inside radius
        $this->actingAs($employee)->post('/attendance/check-in', [
            'mode' => 'office',
            'latitude' => -6.1755000,
            'longitude' => 106.8271528,
        ])->assertSessionHas('success');

        // 1. Attempting normal office check-out outside radius (~1.5km away) -> blocked
        $this->actingAs($employee)->post('/attendance/check-out', [
            'simulated_minutes' => 540,
            'latitude' => -6.1900000,
            'longitude' => 106.8271528,
        ])->assertSessionHas('error');

        $attendance = Attendance::query()->where('user_id', $employee->id)->firstOrFail();
        $this->assertNull($attendance->check_out_at);

        // 2. Attempting site visit checkout without photo -> validation error
        $this->actingAs($employee)->post('/attendance/check-out', [
            'simulated_minutes' => 540,
            'checkout_site_visit' => true,
            'site_visit_project_id' => $project->id,
        ])->assertSessionHasErrors('site_visit_photo');

        // 3. Site visit checkout WITH project + photo succeeds and enters Pusat Approval
        $photo = UploadedFile::fake()->image('pulang_site_visit.jpg', 640, 480);
        $this->actingAs($employee)->post('/attendance/check-out', [
            'simulated_minutes' => 540,
            'checkout_site_visit' => true,
            'site_visit_project_id' => $project->id,
            'site_visit_photo' => $photo,
            'notes' => 'Selesai survey lokasi Pak Dede',
        ])->assertSessionHas('success');

        $attendance->refresh();
        $this->assertNotNull($attendance->check_out_at);
        $this->assertSame($project->id, $attendance->site_visit_project_id);
        $this->assertSame('pending', $attendance->site_visit_status);
        $this->assertStringStartsWith('/uploads/site-visits/site_visit_checkout_', (string) $attendance->site_visit_photo_url);

        // Clean up uploaded test file
        $uploadedPath = public_path(ltrim((string) $attendance->site_visit_photo_url, '/'));
        if (file_exists($uploadedPath)) {
            @unlink($uploadedPath);
        }

        // Verify it appears in Super Admin's Pusat Approval -> Site Visit tab
        $this->actingAs($superAdmin)
            ->get('/attendance/approvals')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('counts.site_visit_pending', 1)
                ->has('siteVisits', 1)
            );
    }

    public function test_split_checkout_and_overtime_requires_exceeded_work_hours_and_office_gps_radius(): void
    {
        OfficeSetting::query()->updateOrCreate([], [
            'office_name' => 'RIM Studio',
            'latitude' => -6.1753924,
            'longitude' => 106.8271528,
            'radius_meters' => 100,
        ]);

        $admin = User::factory()->superAdmin()->create();
        $employee = User::factory()->create();
        $project = Project::factory()->create(['owner_id' => $admin->id]);

        // Checked in at 08:00; currently 10:30 (only 2.5 hours, not yet forgotten checkout)
        $this->travelTo(Carbon::today()->setTime(10, 30));
        Attendance::query()->create([
            'user_id' => $employee->id,
            'date' => Carbon::today()->format('Y-m-d'),
            'mode' => 'office',
            'check_in_at' => Carbon::today()->setTime(8, 0),
            'target_work_minutes' => 540,
            'status' => 'hadir',
        ]);

        // 1. Blocked before regular work hours are met
        $this->actingAs($employee)
            ->post('/attendance/checkout-and-overtime', [
                'project_id' => $project->id,
                'task_description' => 'Terlalu cepat lembur',
                'latitude' => -6.1754500,
                'longitude' => 106.8271528,
            ])
            ->assertSessionHas('error');

        // 2. Travel to 19:00 (forgot checkout) but outside office radius -> blocked
        $this->travelTo(Carbon::today()->setTime(19, 0));
        $this->actingAs($employee)
            ->post('/attendance/checkout-and-overtime', [
                'project_id' => $project->id,
                'task_description' => 'Lembur dari luar kantor',
                'latitude' => -6.1900000,
                'longitude' => 106.8271528,
            ])
            ->assertSessionHas('error');

        // 3. At 19:00 AND inside office radius -> allowed
        $this->actingAs($employee)
            ->post('/attendance/checkout-and-overtime', [
                'project_id' => $project->id,
                'task_description' => 'Lembur di studio setelah lupa checkout',
                'latitude' => -6.1754500,
                'longitude' => 106.8271528,
            ])
            ->assertSessionHas('success');

        $this->assertDatabaseHas('overtimes', [
            'user_id' => $employee->id,
            'project_id' => $project->id,
            'status' => 'active',
        ]);
    }

    public function test_approving_check_in_only_adjustment_does_not_auto_checkout_employee(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $employee = User::factory()->create();

        $attendance = Attendance::query()->create([
            'user_id' => $employee->id,
            'date' => Carbon::today()->format('Y-m-d'),
            'mode' => 'office',
            'check_in_at' => Carbon::today()->setTime(9, 30),
            'check_out_at' => null,
            'target_work_minutes' => 540,
            'status' => 'hadir',
        ]);

        // Even if client accidentally submits adjusted_check_out_time on a check_in-only request
        $this->actingAs($employee)
            ->post('/attendance/adjustment', [
                'adjustment_type' => 'check_in',
                'date' => Carbon::today()->format('Y-m-d'),
                'adjusted_check_in_time' => '08:00',
                'adjusted_check_out_time' => '17:00',
                'notes' => 'Lupa absen masuk jam 8',
            ])
            ->assertRedirect();

        $attendance->refresh();
        $this->assertNull($attendance->adjusted_check_out_at);

        $this->actingAs($admin)
            ->patch("/attendance/approvals/adjustment/{$attendance->id}", [
                'action' => 'approve',
            ])
            ->assertRedirect();

        $attendance->refresh();
        $this->assertSame('08:00', $attendance->check_in_at->format('H:i'));
        $this->assertNull($attendance->check_out_at);
        $this->assertNull($attendance->actual_work_minutes);
    }

    public function test_super_admin_receives_live_pending_approval_count_in_sidebar_badges(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $regularAdmin = User::factory()->admin()->create();
        $employee = User::factory()->create();

        // 1 pending adjustment + 1 pending leave = 2 pending approvals
        Attendance::query()->create([
            'user_id' => $employee->id,
            'date' => Carbon::today()->format('Y-m-d'),
            'mode' => 'office',
            'adjustment_type' => 'check_in',
            'adjustment_status' => 'pending',
            'status' => 'hadir',
        ]);

        LeaveRequest::query()->create([
            'user_id' => $employee->id,
            'type' => 'izin',
            'start_date' => Carbon::today()->format('Y-m-d'),
            'end_date' => Carbon::today()->format('Y-m-d'),
            'total_days' => 1,
            'reason' => 'Keperluan keluarga',
            'status' => 'pending',
        ]);

        $this->actingAs($superAdmin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('sidebarBadges.approvals', 2)
            );

        // Regular Admin does not see approval badge count
        $this->actingAs($regularAdmin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('sidebarBadges.approvals', 0)
            );
    }

    public function test_office_checkin_and_checkout_are_blocked_when_browser_gps_is_denied(): void
    {
        OfficeSetting::query()->updateOrCreate([], [
            'office_name' => 'RIM Studio',
            'latitude' => -6.1753924,
            'longitude' => 106.8271528,
            'radius_meters' => 100,
        ]);

        $employee = User::factory()->create();

        // 1. Check-in office WITHOUT GPS coordinates (browser denied location) -> blocked!
        $this->actingAs($employee)
            ->post('/attendance/check-in', [
                'mode' => 'office',
            ])
            ->assertSessionHas('error');

        $this->assertDatabaseCount('attendances', 0);

        // 2. Check-in office WITH valid GPS inside radius -> succeeds
        $this->actingAs($employee)
            ->post('/attendance/check-in', [
                'mode' => 'office',
                'latitude' => -6.1754500,
                'longitude' => 106.8271528,
            ])
            ->assertSessionHas('success');

        // 3. Check-out office WITHOUT GPS coordinates (browser denied location) -> blocked!
        $this->actingAs($employee)
            ->post('/attendance/check-out', [
                'simulated_minutes' => 540,
            ])
            ->assertSessionHas('error');

        $attendance = Attendance::query()->where('user_id', $employee->id)->firstOrFail();
        $this->assertNull($attendance->check_out_at);
    }

    public function test_employee_cannot_re_checkin_after_already_checking_out_today(): void
    {
        OfficeSetting::query()->updateOrCreate([], [
            'office_name' => 'RIM Studio',
            'latitude' => -6.1753924,
            'longitude' => 106.8271528,
            'radius_meters' => 100,
        ]);

        $employee = User::factory()->create();
        $checkInTime = Carbon::today()->setTime(8, 11);
        $checkOutTime = Carbon::today()->setTime(17, 11);

        $attendance = Attendance::query()->create([
            'user_id' => $employee->id,
            'date' => Carbon::today(),
            'mode' => 'office',
            'check_in_at' => $checkInTime,
            'check_out_at' => $checkOutTime,
            'work_minutes' => 540,
            'shortage_minutes' => 0,
            'status' => 'hadir',
        ]);

        $this->actingAs($employee)
            ->post('/attendance/check-in', [
                'mode' => 'office',
                'latitude' => -6.1754500,
                'longitude' => 106.8271528,
            ])
            ->assertSessionHas('error');

        $attendance->refresh();
        $this->assertSame('08:11', $attendance->check_in_at->format('H:i'));
        $this->assertSame('17:11', $attendance->check_out_at->format('H:i'));
    }

    public function test_wfh_requires_super_admin_pre_approval_and_allows_remote_checkin_checkout(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-25 08:15:00'));

        OfficeSetting::query()->updateOrCreate([], [
            'office_name' => 'RIM Studio',
            'latitude' => -6.1753924,
            'longitude' => 106.8271528,
            'radius_meters' => 100,
        ]);

        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $employee = User::factory()->create(['role' => 'employee']);

        // 1. Cannot check-in WFH without approved WFH request
        $this->actingAs($employee)
            ->post('/attendance/check-in', [
                'mode' => 'wfh',
            ])
            ->assertSessionHas('error');

        $this->assertDatabaseCount('attendances', 0);

        // 2. Employee submits WFH request -> still pending, cannot check-in WFH yet
        $this->actingAs($employee)
            ->post('/attendance/leave-requests', [
                'type' => 'wfh',
                'start_date' => '2026-11-25',
                'end_date' => '2026-11-25',
                'reason' => 'Menunggu teknisi listrik di rumah sambil menyelesaikan DED',
            ])
            ->assertSessionHas('success');

        $wfhRequest = LeaveRequest::query()->where('user_id', $employee->id)->firstOrFail();
        $this->assertSame('wfh', $wfhRequest->type);
        $this->assertSame('pending', $wfhRequest->status);

        $this->actingAs($employee)
            ->post('/attendance/check-in', [
                'mode' => 'wfh',
            ])
            ->assertSessionHas('error');

        // 3. Super Admin approves WFH -> does NOT auto-lock day as non-working leave!
        $this->actingAs($superAdmin)
            ->patch("/attendance/approvals/leave/{$wfhRequest->id}", [
                'action' => 'approve',
            ])
            ->assertSessionHas('success');

        $this->assertDatabaseCount('attendances', 0);

        // 4. Employee checks in WFH from home (far outside 100m office radius) -> succeeds!
        $this->actingAs($employee)
            ->post('/attendance/check-in', [
                'mode' => 'wfh',
                'latitude' => -6.9174639,
                'longitude' => 107.6191228,
                'notes' => 'Fokus revisi gambar denah & tampak',
            ])
            ->assertSessionHas('success');

        $attendance = Attendance::query()->where('user_id', $employee->id)->firstOrFail();
        $this->assertSame('wfh', $attendance->mode);
        $this->assertSame('hadir', $attendance->status);
        $this->assertSame(540, $attendance->target_work_minutes);

        // 5. Employee checks out WFH after 9 hours without office GPS lock -> succeeds as 'hadir'!
        Carbon::setTestNow(Carbon::parse('2026-11-25 17:20:00'));

        $this->actingAs($employee)
            ->post('/attendance/check-out', [
                'simulated_minutes' => 545,
            ])
            ->assertSessionHas('success');

        $attendance->refresh();
        $this->assertNotNull($attendance->check_out_at);
        $this->assertSame('hadir', $attendance->status);
        $this->assertSame(0, $attendance->shortage_minutes);

        Carbon::setTestNow();
    }
}
