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

    public function test_admin_can_create_lightweight_field_project_and_field_worker_can_select_it_for_site_visit(): void
    {
        $admin = User::factory()->admin()->create();
        $fieldWorker = User::factory()->create(['name' => 'Pengawas Lapangan']);
        Employee::factory()->field()->create([
            'user_id' => $fieldWorker->id,
            'position' => 'Site Supervisor',
        ]);

        $response = $this->actingAs($admin)->post(route('projects.field.store'), [
            'name' => 'Pembangunan Rumah Bpk. Hendra',
            'client_name' => 'Bpk. Hendra',
            'client_phone' => '081234567890',
            'location' => 'Jl. Dago Pakar No. 12, Bandung',
            'project_type' => 'pembangunan',
            'status' => 'ongoing',
            'start_date' => '2026-11-25',
            'description' => 'Pembangunan rumah 2 lantai struktur beton',
            'member_ids' => [$fieldWorker->id],
        ]);

        $response->assertRedirect(route('projects.field'));

        $project = Project::query()->where('name', 'Pembangunan Rumah Bpk. Hendra')->firstOrFail();
        $this->assertSame('pembangunan', $project->project_type);
        $this->assertSame('ongoing', $project->status);
        $this->assertSame('Jl. Dago Pakar No. 12, Bandung', $project->location);
        $this->assertTrue($project->members()->where('users.id', $fieldWorker->id)->exists());

        // Verify field worker immediately receives this project in siteVisitProjects options
        $options = Project::siteVisitOptionsFor($fieldWorker);
        $this->assertCount(1, $options);
        $this->assertSame($project->id, $options[0]['id']);
        $this->assertSame('lapangan', $options[0]['group']);

        // Verify field worker can open /field-projects and /field-projects/{project}
        $this->actingAs($fieldWorker)
            ->get(route('projects.field'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('FieldProjects/Index')
                ->where('section', 'field')
                ->has('projects', 1)
                ->where('projects.0.name', 'Pembangunan Rumah Bpk. Hendra'));
    }

    public function test_field_project_detail_displays_site_visit_history_and_allows_updating_project(): void
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

        Attendance::query()->create([
            'user_id' => $fieldWorker->id,
            'date' => Carbon::today()->format('Y-m-d'),
            'mode' => 'site_visit',
            'status' => 'site_visit',
            'check_in_at' => Carbon::today()->setTime(8, 15),
            'target_work_minutes' => 480,
            'site_visit_project_id' => $project->id,
            'site_visit_status' => 'pending',
            'notes' => 'Cek pembesian pondasi tapak',
        ]);

        $this->actingAs($fieldWorker)
            ->get(route('projects.field.show', $project->id))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('FieldProjects/Show')
                ->where('project.name', 'Villa Lembang Asri')
                ->has('siteVisits', 1)
                ->where('siteVisits.0.user_name', 'Mandor Budi')
                ->where('siteVisits.0.notes', 'Cek pembesian pondasi tapak'));

        // Non-admin cannot update or delete field projects
        $this->actingAs($fieldWorker)
            ->put(route('projects.field.update', $project->id), [
                'name' => 'Hack Name',
                'client_name' => 'Client',
                'location' => 'Lokasi',
                'project_type' => 'pembangunan',
                'status' => 'ongoing',
            ])
            ->assertForbidden();

        // Admin can update and delete field project
        $this->actingAs($admin)
            ->put(route('projects.field.update', $project->id), [
                'name' => 'Villa Lembang Asri Tahap 2',
                'client_name' => $project->client_name,
                'location' => 'Jl. Raya Lembang No. 88',
                'project_type' => 'desain_bangun',
                'status' => 'done',
                'member_ids' => [$fieldWorker->id],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'name' => 'Villa Lembang Asri Tahap 2',
            'location' => 'Jl. Raya Lembang No. 88',
            'project_type' => 'desain_bangun',
            'status' => 'done',
        ]);

        $this->actingAs($admin)
            ->delete(route('projects.field.destroy', $project->id))
            ->assertRedirect(route('projects.field'));

        $this->assertSoftDeleted('projects', ['id' => $project->id]);
    }
}
