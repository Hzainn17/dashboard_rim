<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FieldProjectTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_field_project_with_maps_url_and_it_never_leaks_into_planning_projects(): void
    {
        $admin = User::factory()->admin()->create();
        $fieldWorker = User::factory()->create(['name' => 'Pengawas Lapangan']);
        Employee::factory()->field()->create([
            'user_id' => $fieldWorker->id,
            'position' => 'Site Supervisor',
        ]);

        // Even if URL is pasted inside location OR passed via maps_url, it is cleanly split
        $response = $this->actingAs($admin)->post(route('projects.field.store'), [
            'name' => 'Tommy House Design and Construction',
            'client_name' => 'Mr. Tommy',
            'client_phone' => '081234567890',
            'location' => 'Bumi Adipura, Cluster Cempaka, Jl. Cempaka XI no. 21, Gedebage https://maps.app.goo.gl/cmNDQcXp8X7J8wEt8',
            'project_type' => 'desain_bangun',
            'status' => 'ongoing',
            'start_date' => '2026-11-25',
            'description' => 'Pembangunan rumah 2 lantai struktur beton',
            'member_ids' => [$fieldWorker->id],
        ]);

        $response->assertRedirect(route('projects.field'));

        $project = Project::query()->where('name', 'Tommy House Design and Construction')->firstOrFail();
        $this->assertSame('desain_bangun', $project->project_type);
        $this->assertSame('Bumi Adipura, Cluster Cempaka, Jl. Cempaka XI no. 21, Gedebage', $project->location);
        $this->assertSame('https://maps.app.goo.gl/cmNDQcXp8X7J8wEt8', $project->maps_url);

        // Must NOT appear in /projects (Proyek Perencanaan)
        $this->actingAs($admin)
            ->get(route('projects.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('section', 'planning')
                ->has('projects', 0));

        // Must appear in /field-projects (Proyek Lapangan) with clean location & google_maps_url
        $this->actingAs($fieldWorker)
            ->get(route('projects.field'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('FieldProjects/Index')
                ->where('section', 'field')
                ->has('projects', 1)
                ->where('projects.0.location', 'Bumi Adipura, Cluster Cempaka, Jl. Cempaka XI no. 21, Gedebage')
                ->where('projects.0.maps_url', 'https://maps.app.goo.gl/cmNDQcXp8X7J8wEt8'));
    }

    public function test_field_project_supports_retention_status_and_remains_selectable_for_site_visit(): void
    {
        $admin = User::factory()->admin()->create();
        $fieldWorker = User::factory()->create(['name' => 'Mandor Budi']);
        Employee::factory()->field()->create([
            'user_id' => $fieldWorker->id,
            'position' => 'Pengawas Lapangan',
        ]);

        $project = Project::factory()->construction()->create([
            'owner_id' => $admin->id,
            'name' => 'Villa Lembang Asri',
            'location' => 'Lembang, Bandung Barat',
            'status' => 'ongoing',
        ]);
        $project->members()->sync([$fieldWorker->id => ['role_in_project' => 'Lead Lapangan']]);

        // Update project into Masa Retensi (Pemeliharaan) with dedicated maps_url
        $this->actingAs($admin)
            ->put(route('projects.field.update', $project->id), [
                'name' => 'Villa Lembang Asri',
                'client_name' => $project->client_name,
                'location' => 'Jl. Raya Lembang No. 88',
                'maps_url' => 'https://maps.app.goo.gl/VillaLembang88',
                'project_type' => 'pembangunan',
                'status' => 'retention',
                'member_ids' => [$fieldWorker->id],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'location' => 'Jl. Raya Lembang No. 88',
            'maps_url' => 'https://maps.app.goo.gl/VillaLembang88',
            'status' => 'retention',
        ]);

        // Field worker can still select a retention project for Site Visit attendance
        $options = Project::siteVisitOptionsFor($fieldWorker);
        $this->assertCount(1, $options);
        $this->assertSame($project->id, $options[0]['id']);

        Attendance::query()->create([
            'user_id' => $fieldWorker->id,
            'date' => Carbon::today()->format('Y-m-d'),
            'mode' => 'site_visit',
            'status' => 'site_visit',
            'check_in_at' => Carbon::today()->setTime(8, 15),
            'target_work_minutes' => 480,
            'site_visit_project_id' => $project->id,
            'site_visit_status' => 'pending',
            'notes' => 'Inspeksi perbaikan retensi atap',
        ]);

        $this->actingAs($fieldWorker)
            ->get(route('projects.field.show', $project->id))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('FieldProjects/Show')
                ->where('project.status', 'retention')
                ->where('project.maps_url', 'https://maps.app.goo.gl/VillaLembang88')
                ->has('siteVisits', 1)
                ->where('siteVisits.0.notes', 'Inspeksi perbaikan retensi atap'));
    }
}
