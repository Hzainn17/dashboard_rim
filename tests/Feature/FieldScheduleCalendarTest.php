<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\CalendarEvent;
use App\Models\Employee;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FieldScheduleCalendarTest extends TestCase
{
    use RefreshDatabase;

    public function test_field_schedule_syncs_between_field_projects_calendar_and_dashboard_notice(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Rindi Admin Project']);
        $fieldWorker = User::factory()->create(['name' => 'Dendi Lapangan']);
        Employee::factory()->field()->create(['user_id' => $fieldWorker->id]);

        $project = Project::factory()->construction()->create([
            'owner_id' => $admin->id,
            'name' => 'Rumah Jatinangor',
            'location' => 'Jatinangor, Sumedang',
        ]);
        $project->members()->sync([$fieldWorker->id => ['role_in_project' => 'Lead Lapangan']]);

        $tomorrow = Carbon::tomorrow()->format('Y-m-d');

        $this->actingAs($admin)
            ->post(route('calendar.events.store'), [
                'title' => 'Perbaikan Item Jatinangor',
                'location' => 'Jatinangor, Sumedang',
                'type' => 'field_schedule',
                'start_date' => $tomorrow,
                'end_date' => $tomorrow,
                'start_time' => '09:00',
                'end_time' => '12:00',
                'project_id' => $project->id,
                'participant_ids' => [$fieldWorker->id],
                'checklist_items' => [
                    ['text' => 'Tambal retak rambut dinding', 'done' => false],
                    ['text' => 'Cek talang air garasi', 'done' => false],
                ],
            ])
            ->assertRedirect();

        $event = CalendarEvent::query()->where('title', 'Perbaikan Item Jatinangor')->firstOrFail();
        $this->assertSame('field_schedule', $event->type);
        $this->assertCount(2, $event->checklist_items);

        // Visible in /field-projects (Kalender Khusus Lapangan)
        $this->actingAs($fieldWorker)
            ->get(route('projects.field'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('fieldSchedules', 1)
                ->where('fieldSchedules.0.title', 'Perbaikan Item Jatinangor'));

        // Synced into /dashboard (upcomingFieldSchedules notice + calendarEvents)
        $this->actingAs($admin)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('upcomingFieldSchedules', 1)
                ->where('upcomingFieldSchedules.0.title', 'Perbaikan Item Jatinangor'));

        // Toggle both checklist items -> auto marks event completed
        $this->actingAs($fieldWorker)
            ->patch(route('calendar.events.toggle', $event), ['checklist_index' => 0])
            ->assertRedirect();
        $this->assertFalse($event->fresh()->is_completed);

        $this->actingAs($fieldWorker)
            ->patch(route('calendar.events.toggle', $event), ['checklist_index' => 1])
            ->assertRedirect();
        $this->assertTrue($event->fresh()->is_completed);
    }

    public function test_routine_field_worker_site_visit_attendance_is_excluded_from_studio_agenda_while_office_site_visit_is_included(): void
    {
        $admin = User::factory()->admin()->create();

        $fieldWorker = User::factory()->create(['name' => 'Reza Lapangan']);
        Employee::factory()->field()->create(['user_id' => $fieldWorker->id]);

        $officeArchitect = User::factory()->create(['name' => 'Syifa Arsitek Kantor']);
        Employee::factory()->create(['user_id' => $officeArchitect->id, 'work_type' => 'kantor']);

        $project = Project::factory()->construction()->create(['owner_id' => $admin->id]);
        $today = Carbon::today();

        // Routine field worker check-in (should NOT appear in Studio Agenda / Calendar)
        Attendance::query()->create([
            'user_id' => $fieldWorker->id,
            'date' => $today->format('Y-m-d'),
            'mode' => 'site_visit',
            'status' => 'site_visit',
            'check_in_at' => $today->copy()->setTime(8, 10),
            'target_work_minutes' => 480,
            'site_visit_project_id' => $project->id,
        ]);

        // Office architect going out on a Site Visit (SHOULD appear in Studio Agenda / Calendar)
        Attendance::query()->create([
            'user_id' => $officeArchitect->id,
            'date' => $today->format('Y-m-d'),
            'mode' => 'site_visit',
            'status' => 'site_visit',
            'check_in_at' => $today->copy()->setTime(9, 0),
            'target_work_minutes' => 540,
            'site_visit_project_id' => $project->id,
        ]);

        $this->actingAs($admin)
            ->get(route('calendar.index', ['type' => 'site_visit']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('events', 1)
                ->where('events.0.creator_name', 'Syifa Arsitek Kantor'));
    }
}
