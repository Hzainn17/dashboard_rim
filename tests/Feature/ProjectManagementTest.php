<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProjectManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_view_project_index(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $project = Project::factory()->create([
            'owner_id' => $admin->id,
            'name' => 'Villa Sunset Cliff Jimbaran',
            'category' => 'Villa & Resort',
            'status' => 'ongoing',
        ]);

        $response = $this->actingAs($admin)->get('/projects');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Projects/Index')
            ->has('projects', 1)
            ->where('projects.0.name', 'Villa Sunset Cliff Jimbaran')
            ->has('metrics')
            ->where('metrics.total_projects', 1)
            ->has('categories')
            ->has('teamMembers')
        );
    }

    public function test_project_index_search_and_filter(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        Project::factory()->create([
            'owner_id' => $admin->id,
            'name' => 'Rumah Tropis Menteng',
            'category' => 'Residensial',
        ]);

        Project::factory()->create([
            'owner_id' => $admin->id,
            'name' => 'Cafe Industrial Senopati',
            'category' => 'Komersial',
        ]);

        // Search Menteng
        $searchResponse = $this->actingAs($admin)->get('/projects?search=Menteng');
        $searchResponse->assertOk();
        $searchResponse->assertInertia(fn (Assert $page) => $page
            ->component('Projects/Index')
            ->has('projects', 1)
            ->where('projects.0.name', 'Rumah Tropis Menteng')
        );

        // Filter category Komersial
        $categoryResponse = $this->actingAs($admin)->get('/projects?category=Komersial');
        $categoryResponse->assertOk();
        $categoryResponse->assertInertia(fn (Assert $page) => $page
            ->component('Projects/Index')
            ->has('projects', 1)
            ->where('projects.0.name', 'Cafe Industrial Senopati')
        );
    }

    public function test_admin_can_create_new_project_with_custom_stages_and_team(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $architect = User::factory()->create(['name' => 'Arif Budiman']);
        Employee::factory()->for($architect)->create(['position' => 'Lead Architect']);

        $drafter = User::factory()->create(['name' => 'Citra Lestari']);
        Employee::factory()->for($drafter)->create(['position' => 'Drafter']);

        $response = $this->actingAs($admin)->post('/projects', [
            'name' => 'Rumah Tinggal Modern Tropis',
            'client_name' => 'Bapak Hendra',
            'client_phone' => '081234567890',
            'location' => 'Pondok Indah, Jakarta Selatan',
            'category' => 'Residensial',
            'drive_url' => 'https://drive.google.com/drive/folders/test123',
            'description' => 'Desain rumah tinggal 2 lantai dengan konsep open courtyard.',
            'start_date' => now()->format('Y-m-d'),
            'due_date' => now()->addMonths(3)->format('Y-m-d'),
            'status' => 'ongoing',
            'lead_id' => $architect->id,
            'member_ids' => [$drafter->id],
            'stages' => [
                '1. Skematik Desain',
                '2. Gambar Kerja (DED)',
                '3. Visualisasi 3D Render',
            ],
        ]);

        $this->assertDatabaseHas('projects', [
            'name' => 'Rumah Tinggal Modern Tropis',
            'client_name' => 'Bapak Hendra',
            'category' => 'Residensial',
        ]);

        $project = Project::where('name', 'Rumah Tinggal Modern Tropis')->first();
        $this->assertNotNull($project);
        $this->assertCount(3, $project->stages);
        $this->assertCount(2, $project->members);

        $response->assertRedirect(route('projects.show', $project->id));
    }

    public function test_non_admin_cannot_create_project(): void
    {
        $employee = User::factory()->create();
        Employee::factory()->for($employee)->create();

        $response = $this->actingAs($employee)->post('/projects', [
            'name' => 'Project Ilegal',
            'client_name' => 'Klien Test',
            'status' => 'ongoing',
        ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('projects', ['name' => 'Project Ilegal']);
    }

    public function test_user_can_view_project_detail_with_kanban(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $project = Project::factory()->create([
            'owner_id' => $admin->id,
            'name' => 'Villa Sunset Bali',
        ]);

        $stage = ProjectStage::create([
            'project_id' => $project->id,
            'name' => '1. Konsep Desain',
            'order' => 1,
            'status' => 'active',
        ]);

        ProjectTask::create([
            'project_id' => $project->id,
            'stage_id' => $stage->id,
            'title' => 'Buat moodboard & zoning denah',
            'status' => 'todo',
            'priority' => 'high',
            'order_column' => 1,
        ]);

        $response = $this->actingAs($admin)->get("/projects/{$project->id}");

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Projects/Show')
            ->has('project')
            ->where('project.name', 'Villa Sunset Bali')
            ->has('kanban.todo', 1)
            ->where('kanban.todo.0.title', 'Buat moodboard & zoning denah')
            ->has('kanban.in_progress', 0)
            ->has('kanban.review', 0)
            ->has('kanban.done', 0)
            ->has('updates')
            ->has('teamMembers')
        );
    }

    public function test_user_can_create_and_update_task_and_recalculate_progress(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $project = Project::factory()->create([
            'owner_id' => $admin->id,
            'progress_percent' => 0,
        ]);

        $stage = ProjectStage::create([
            'project_id' => $project->id,
            'name' => 'Gambar Kerja',
            'order' => 1,
            'status' => 'active',
        ]);

        // Create Task 1
        $this->actingAs($admin)->post("/projects/{$project->id}/tasks", [
            'title' => 'Gambar Denah Lt 1',
            'stage_id' => $stage->id,
            'status' => 'todo',
            'priority' => 'medium',
        ]);

        $this->assertDatabaseHas('project_tasks', [
            'project_id' => $project->id,
            'title' => 'Gambar Denah Lt 1',
            'status' => 'todo',
        ]);

        // Create Task 2
        $this->actingAs($admin)->post("/projects/{$project->id}/tasks", [
            'title' => 'Gambar Tampak Depan & Belakang',
            'stage_id' => $stage->id,
            'status' => 'todo',
            'priority' => 'high',
        ]);

        $project->refresh();
        $this->assertEquals(0, $project->progress_percent);

        $task1 = ProjectTask::where('title', 'Gambar Denah Lt 1')->first();

        // Update status Task 1 to 'done' -> progress should be 50% (1/2)
        $this->actingAs($admin)->patch("/projects/{$project->id}/tasks/{$task1->id}/status", [
            'status' => 'done',
        ]);

        $project->refresh();
        $this->assertEquals(50, $project->progress_percent);
        $this->assertNotNull($task1->fresh()->completed_at);
    }

    public function test_user_can_post_project_update_feed(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $project = Project::factory()->create(['owner_id' => $admin->id]);

        $this->actingAs($admin)->post("/projects/{$project->id}/updates", [
            'content' => 'Klien telah menyetujui layout denah lantai 1 tanpa revisi.',
        ]);

        $this->assertDatabaseHas('project_updates', [
            'project_id' => $project->id,
            'user_id' => $admin->id,
            'content' => 'Klien telah menyetujui layout denah lantai 1 tanpa revisi.',
        ]);
    }

    public function test_admin_can_delete_project(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $project = Project::factory()->create([
            'owner_id' => $admin->id,
            'name' => 'Proyek Dihapus',
        ]);

        $response = $this->actingAs($admin)->delete("/projects/{$project->id}");

        $response->assertRedirect('/projects');
        $this->assertSoftDeleted('projects', ['id' => $project->id]);
    }
}
