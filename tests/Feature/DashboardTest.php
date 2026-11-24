<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login(): void
    {
        $response = $this->get('/dashboard');

        $response->assertRedirect('/login');
    }

    public function test_authenticated_user_can_view_dashboard(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('metrics')
            ->has('projects')
            ->has('calendarEvents')
            ->has('activities')
            ->has('officeSetting')
            ->has('projectOptions')
        );
    }

    public function test_dashboard_metrics_match_active_database_records_accurately(): void
    {
        $today = Carbon::today();

        // 1 SuperAdmin (excluded) + 1 Admin + 4 active Employees = 5 active non-super-admin personnel, plus 1 inactive employee (excluded)
        $superAdmin = User::factory()->superAdmin()->create();
        $regularAdmin = User::factory()->admin()->create();
        $employees = User::factory()->count(4)->create();
        $inactive = User::factory()->inactive()->create();

        // All 6 active personnel check in at office today (Super Admin should be excluded from both counts)
        foreach ([$superAdmin, $regularAdmin, ...$employees] as $person) {
            Attendance::factory()->create([
                'user_id' => $person->id,
                'date' => $today->format('Y-m-d'),
                'mode' => 'office',
                'status' => 'hadir',
            ]);
        }

        // Inactive user's attendance should not inflate count
        Attendance::factory()->create([
            'user_id' => $inactive->id,
            'date' => $today->format('Y-m-d'),
            'mode' => 'office',
            'status' => 'hadir',
        ]);

        // 1 active project + 1 survey project (survey should be tracked separately)
        Project::factory()->create([
            'owner_id' => $superAdmin->id,
            'status' => 'ongoing',
            'due_date' => $today->copy()->addDays(3),
        ]);
        Project::factory()->create([
            'owner_id' => $superAdmin->id,
            'status' => 'survey',
            'due_date' => $today->copy()->addDays(2),
        ]);

        $this->actingAs($superAdmin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('metrics.total_employees', 5)
                ->where('metrics.present_count', 5)
                ->where('metrics.site_visit_count', 0)
                ->where('metrics.active_projects_count', 1)
                ->where('metrics.survey_projects_count', 1)
                ->where('metrics.urgent_projects_count', 1)
            );
    }
}
