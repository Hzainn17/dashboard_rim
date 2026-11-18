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

class CalendarTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_view_calendar_with_manual_events_and_auto_integrations(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $architect = User::factory()->create();
        Employee::factory()->for($architect)->create();

        $currentMonth = (int) now()->month;
        $currentYear = (int) now()->year;

        // 1. Manual Event
        $manualEvent = CalendarEvent::factory()->create([
            'title' => 'Rapat Koordinasi MEP',
            'type' => 'meeting',
            'start_at' => Carbon::create($currentYear, $currentMonth, 15, 10, 0),
            'end_at' => Carbon::create($currentYear, $currentMonth, 15, 12, 0),
            'created_by' => $admin->id,
        ]);

        // 2. Project with due date in current month (Automatic Deadline Event)
        $project = Project::factory()->create([
            'name' => 'Villa Canggu',
            'due_date' => Carbon::create($currentYear, $currentMonth, 20),
            'owner_id' => $admin->id,
        ]);

        // 3. Attendance Site Visit in current month (Automatic Site Visit Event)
        Attendance::factory()->create([
            'user_id' => $architect->id,
            'mode' => 'site_visit',
            'site_visit_project_id' => $project->id,
            'date' => Carbon::create($currentYear, $currentMonth, 10),
            'check_in_at' => Carbon::create($currentYear, $currentMonth, 10, 9, 30),
            'notes' => 'Inspeksi pengecoran balok lantai 2',
        ]);

        $response = $this->actingAs($admin)->get("/calendar?month={$currentMonth}&year={$currentYear}");

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Calendar/Index')
            ->has('events', 3)
            ->has('projects')
            ->has('teamMembers')
            ->where('currentMonth', $currentMonth)
            ->where('currentYear', $currentYear)
        );
    }

    public function test_user_can_create_new_calendar_event(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $coworker = User::factory()->create();
        Employee::factory()->for($coworker)->create();

        $project = Project::factory()->create(['owner_id' => $admin->id]);

        $response = $this->actingAs($admin)->post('/calendar/events', [
            'title' => 'Asistensi Denah bersama Ibu Maya',
            'type' => 'milestone',
            'project_id' => $project->id,
            'start_date' => now()->format('Y-m-d'),
            'start_time' => '14:00',
            'end_date' => now()->format('Y-m-d'),
            'end_time' => '15:30',
            'location' => 'Meeting Room 1 / Google Meet',
            'description' => 'Membahas revisi denah zoning kamar utama.',
            'participant_ids' => [$coworker->id],
        ]);

        $this->assertDatabaseHas('calendar_events', [
            'title' => 'Asistensi Denah bersama Ibu Maya',
            'type' => 'milestone',
            'project_id' => $project->id,
            'location' => 'Meeting Room 1 / Google Meet',
            'created_by' => $admin->id,
        ]);

        $event = CalendarEvent::where('title', 'Asistensi Denah bersama Ibu Maya')->first();
        $this->assertNotNull($event);
        $this->assertTrue($event->participants->contains($coworker->id));

        $response->assertRedirect();
    }

    public function test_user_can_delete_manual_calendar_event(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $event = CalendarEvent::factory()->create([
            'title' => 'Event yang akan dibatalkan',
            'created_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin)->delete("/calendar/events/{$event->id}");

        $response->assertRedirect();
        $this->assertDatabaseMissing('calendar_events', ['id' => $event->id]);
    }
}
