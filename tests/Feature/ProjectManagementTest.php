<?php

namespace Tests\Feature;

use App\Http\Controllers\CalendarController;
use App\Models\Employee;
use App\Models\Project;
use App\Models\ProjectClientBrief;
use App\Models\ProjectStage;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
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

    public function test_admin_can_create_project_with_pricelist_package_and_timeline_syncs_to_studio_calendar(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $response = $this->actingAs($admin)->post('/projects', [
            'name' => 'Home Design Pak Rudi',
            'client_name' => 'Pak Rudi',
            'package_name' => 'Paket 3',
            'package_addons' => ['Add-On Interior Design'],
            'building_area' => 150,
            'estimated_budget' => 24000000,
            'custom_scope_notes' => 'Tambahan render ruang tamu',
            'start_date' => '2026-11-12',
            'status' => 'ongoing',
        ]);

        $project = Project::query()->where('name', 'Home Design Pak Rudi')->firstOrFail();
        $response->assertRedirect("/projects/{$project->id}");

        $this->assertEquals('Paket 3', $project->package_name);
        $this->assertEquals(150.0, $project->building_area);
        $this->assertEquals(['Add-On Interior Design'], $project->package_addons);

        $stages = $project->stages()->orderBy('order')->get();
        $this->assertCount(6, $stages);
        $this->assertEquals('Tahap Konseptual V1', $stages[0]->name);
        $this->assertEquals('RAB', $stages[5]->name);
        $this->assertNotNull($stages[0]->update_design_date);
        $this->assertNotNull($stages[0]->client_response_date);

        // Update stage timeline and verify studio calendar includes it
        $firstStage = $stages[0];
        $updateResponse = $this->actingAs($admin)->put("/projects/{$project->id}/stages/{$firstStage->id}", [
            'name' => 'Tahap Konseptual V1 (Revisi)',
            'status' => 'active',
            'update_design_date' => '2026-11-25',
            'client_response_date' => '2026-11-28',
            'duration_workdays' => 7,
            'output_notes' => 'Denah & massa bangunan',
        ]);

        $updateResponse->assertRedirect();
        $firstStage->refresh();
        $this->assertEquals('2026-11-25', $firstStage->update_design_date?->format('Y-m-d'));

        // Verify Studio Calendar reflects the updated stage deadline
        $calendarEvents = CalendarController::getUnifiedEvents(
            Carbon::parse('2026-11-01'),
            Carbon::parse('2026-11-30')
        );

        $this->assertTrue(
            $calendarEvents->contains(fn ($ev) => str_contains($ev['title'], 'Tahap Konseptual V1 (Revisi)') && $ev['date'] === '2026-11-25')
        );

        // Verify printable timeline page renders OK
        $printResponse = $this->actingAs($admin)->get("/projects/{$project->id}/timeline/print");
        $printResponse->assertOk();
        $printResponse->assertSee('Home Design Pak Rudi');
        $printResponse->assertSee('Tahap Konseptual V1 (Revisi)');

        // Verify stages can be reordered
        $reversedIds = $stages->pluck('id')->reverse()->values()->all();
        $reorderResponse = $this->actingAs($admin)->patch("/projects/{$project->id}/stages/reorder", [
            'stage_ids' => $reversedIds,
        ]);
        $reorderResponse->assertRedirect();

        $reorderedStages = $project->stages()->orderBy('order')->pluck('id')->all();
        $this->assertEquals($reversedIds, $reorderedStages);
    }

    public function test_project_index_includes_timeline_projects_for_running_calendar(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $ongoing = Project::factory()->create([
            'owner_id' => $admin->id,
            'name' => 'Villa Aktif',
            'status' => 'ongoing',
        ]);
        ProjectStage::query()->create([
            'project_id' => $ongoing->id,
            'name' => 'Tahap Konseptual V1',
            'order' => 1,
            'status' => 'active',
            'update_design_date' => '2026-11-20',
            'client_response_date' => '2026-11-23',
        ]);

        Project::factory()->create([
            'owner_id' => $admin->id,
            'name' => 'Rumah Selesai',
            'status' => 'done',
        ]);

        $response = $this->actingAs($admin)->get('/projects');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Projects/Index')
            ->has('timelineProjects', 1)
            ->where('timelineProjects.0.name', 'Villa Aktif')
            ->has('timelineProjects.0.stages', 1)
        );
    }

    public function test_admin_can_customize_client_brief_and_client_can_submit_publicly(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $project = Project::factory()->create([
            'owner_id' => $admin->id,
            'name' => 'Rumah Tropis Pak Andi',
            'client_name' => 'Pak Andi',
        ]);

        // Viewing project auto-creates clientBrief
        $showResponse = $this->actingAs($admin)->get("/projects/{$project->id}");
        $showResponse->assertOk();
        $showResponse->assertInertia(fn (Assert $page) => $page
            ->component('Projects/Show')
            ->has('clientBrief.fields')
            ->where('clientBrief.status', 'draft')
        );

        $brief = ProjectClientBrief::forProject($project);

        // Customize form fields
        $customFields = [
            [
                'key' => 'site_address',
                'section' => 'Data Lokasi & Lahan',
                'label' => 'Alamat Lengkap',
                'type' => 'textarea',
                'required' => true,
            ],
            [
                'key' => 'site_maps',
                'section' => 'Data Lokasi & Lahan',
                'label' => 'Titik Google Maps',
                'type' => 'maps',
                'required' => true,
            ],
            [
                'key' => 'site_orientation',
                'section' => 'Data Lokasi & Lahan',
                'label' => 'Arah Hadap Lahan',
                'type' => 'compass',
                'required' => true,
            ],
            [
                'key' => 'custom_pool',
                'section' => 'Kebutuhan Khusus',
                'label' => 'Apakah butuh kolam koi?',
                'type' => 'select',
                'required' => false,
                'options' => ['Ya', 'Tidak'],
            ],
        ];

        $this->actingAs($admin)
            ->put("/projects/{$project->id}/brief", ['fields' => $customFields])
            ->assertRedirect();

        $this->actingAs($admin)
            ->post("/projects/{$project->id}/brief/send")
            ->assertRedirect();

        $brief->refresh();
        $this->assertEquals('sent', $brief->status);
        $this->assertCount(4, $brief->fields);

        // Public client opens /brief/{token} without authentication
        auth()->logout();
        $publicGet = $this->get("/brief/{$brief->token}");
        $publicGet->assertOk();
        $publicGet->assertInertia(fn (Assert $page) => $page
            ->component('ClientBrief/Form')
            ->where('project.name', 'Rumah Tropis Pak Andi')
            ->has('fields', 4)
        );

        // Client submits answers
        $publicPost = $this->post("/brief/{$brief->token}", [
            'answers' => [
                'site_address' => 'Jl. Dago Pakar No. 12, Bandung',
                'site_maps' => [
                    'url' => 'https://www.google.com/maps?q=-6.8675,107.6245',
                    'lat' => '-6.8675',
                    'lng' => '107.6245',
                ],
                'site_orientation' => 'Timur',
                'custom_pool' => 'Ya',
            ],
        ]);
        $publicPost->assertRedirect();

        $brief->refresh();
        $this->assertEquals('submitted', $brief->status);
        $this->assertNotNull($brief->submitted_at);
        $this->assertEquals('Jl. Dago Pakar No. 12, Bandung', $brief->responses['site_address']);
        $this->assertEquals('Timur', $brief->responses['site_orientation']);
        $this->assertEquals('Ya', $brief->responses['custom_pool']);
    }
}
