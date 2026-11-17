<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    /**
     * Seed sample projects with manual stages, members, and kanban tasks.
     */
    public function run(): void
    {
        $admin = User::query()->where('role', UserRole::Admin)->firstOrFail();
        $employees = User::query()->where('role', UserRole::Employee)->get();

        $projects = [
            ['name' => 'Rumah Tinggal Pak Hendra', 'client_name' => 'Hendra Wijaya', 'category' => 'Residensial', 'location' => 'Bandung'],
            ['name' => 'Kafe Kopi Senja', 'client_name' => 'PT Senja Abadi', 'category' => 'Komersial', 'location' => 'Jakarta Selatan'],
            ['name' => 'Interior Apartemen Ibu Maya', 'client_name' => 'Maya Sari', 'category' => 'Interior', 'location' => 'Tangerang'],
        ];

        $stageNames = ['Konsep Desain', 'Pengembangan Desain', 'Gambar Kerja', 'Pengawasan'];
        $statuses = ['todo', 'in_progress', 'review', 'done'];

        foreach ($projects as $data) {
            $project = Project::factory()->create([...$data, 'owner_id' => $admin->id]);

            $stages = collect($stageNames)->map(fn (string $name, int $index) => $project->stages()->create([
                'name' => $name,
                'order' => $index + 1,
                'status' => $index === 0 ? 'active' : 'pending',
            ]));

            $members = $employees->random(3);
            $project->members()->attach($members->pluck('id')->mapWithKeys(fn (int $id, int $index) => [
                $id => ['role_in_project' => $index === 0 ? 'Lead' : 'Anggota'],
            ])->all());

            foreach (range(1, 8) as $order) {
                ProjectTask::factory()->for($project)->create([
                    'stage_id' => $stages->random()->id,
                    'assignee_id' => $members->random()->id,
                    'status' => $status = fake()->randomElement($statuses),
                    'order_column' => $order,
                    'completed_at' => $status === 'done' ? now() : null,
                ]);
            }

            $project->recalculateProgress();
        }
    }
}
