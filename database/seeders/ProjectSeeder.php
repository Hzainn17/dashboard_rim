<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\ProjectTask;
use App\Models\ProjectUpdate;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class ProjectSeeder extends Seeder
{
    /**
     * Seed sample projects with architectural stages, members, and Notion-style kanban tasks.
     */
    public function run(): void
    {
        $admin = User::query()->where('role', UserRole::Admin)->firstOrFail();
        $employees = User::query()->where('role', UserRole::Employee)->orderBy('id')->get();

        $budi = $employees->firstWhere('email', 'budi@rimstudio.com') ?? $employees->get(0) ?? $admin;
        $siti = $employees->firstWhere('email', 'siti@rimstudio.com') ?? $employees->get(1) ?? $admin;
        $andi = $employees->firstWhere('email', 'andi@rimstudio.com') ?? $employees->get(2) ?? $admin;
        $dewi = $employees->firstWhere('email', 'dewi@rimstudio.com') ?? $employees->get(3) ?? $admin;
        $rizky = $employees->firstWhere('email', 'rizky@rimstudio.com') ?? $employees->get(4) ?? $admin;

        $stageTemplates = ['Konsep', 'Pra-Rancangan', 'DED', '3D Visualisasi', 'Konstruksi'];

        $projectsData = [
            [
                'id' => 1,
                'name' => 'Rumah Tropis Canggu',
                'client_name' => 'Bpk. Hendra Wijaya',
                'client_phone' => '081234567801',
                'location' => 'Bali',
                'category' => 'Residensial',
                'cover_image_url' => '/project-covers/rumah-tropis.png',
                'drive_url' => 'https://drive.google.com/drive/folders/rim-rumah-canggu',
                'description' => 'Desain rumah tinggal modern tropis 2 lantai dengan konsep open-plan, sunken living room, dan kolam renang infinity.',
                'status' => 'ongoing',
                'start_date' => Carbon::today()->subDays(55),
                'due_date' => Carbon::today()->addDays(5),
                'active_stage' => 'DED',
                'members' => [
                    $budi->id => ['role_in_project' => 'Lead Architect'],
                    $andi->id => ['role_in_project' => '3D Visualizer'],
                    $siti->id => ['role_in_project' => 'Drafter'],
                ],
                'tasks' => [
                    ['title' => 'Konsep zoning & gubahan massa tropis', 'stage' => 'Konsep', 'status' => 'done', 'priority' => 'high', 'assignee_id' => $budi->id],
                    ['title' => 'Denah arsitektur lantai 1 & lantai 2', 'stage' => 'Pra-Rancangan', 'status' => 'done', 'priority' => 'high', 'assignee_id' => $budi->id],
                    ['title' => 'Render 3D eksterior fasad utama & pool deck', 'stage' => '3D Visualisasi', 'status' => 'done', 'priority' => 'medium', 'assignee_id' => $andi->id],
                    ['title' => 'Gambar kerja potongan A-A dan B-B (1:50)', 'stage' => 'DED', 'status' => 'done', 'priority' => 'high', 'assignee_id' => $siti->id],
                    ['title' => 'Detail konstruksi atap miring & talang tersembunyi', 'stage' => 'DED', 'status' => 'done', 'priority' => 'medium', 'assignee_id' => $siti->id],
                    ['title' => 'Gambar kerja instalasi MEP & titik lampu', 'stage' => 'DED', 'status' => 'in_progress', 'priority' => 'high', 'assignee_id' => $siti->id],
                    ['title' => 'Asistensi final spesifikasi material fasad kayu ulin', 'stage' => 'DED', 'status' => 'review', 'priority' => 'high', 'assignee_id' => $budi->id],
                ],
                'updates' => [
                    ['user_id' => $budi->id, 'content' => 'Denah lantai 1 & 2 sudah disetujui Bpk. Hendra. Saat ini fokus penyelesaian paket gambar kerja DED.'],
                ],
            ],
            [
                'id' => 2,
                'name' => 'Menara Kantor Sudirman',
                'client_name' => 'PT Graha Nusantara',
                'client_phone' => '081234567802',
                'location' => 'Jakarta Selatan',
                'category' => 'Komersial',
                'cover_image_url' => '/project-covers/kantor-sudirman.png',
                'drive_url' => 'https://drive.google.com/drive/folders/rim-menara-sudirman',
                'description' => 'Gedung perkantoran 8 lantai berkonsep green building dengan double-skin facade aluminium louver dan sky garden.',
                'status' => 'ongoing',
                'start_date' => Carbon::today()->subDays(70),
                'due_date' => Carbon::today()->addDays(38),
                'active_stage' => 'Pra-Rancangan',
                'members' => [
                    $admin->id => ['role_in_project' => 'Lead Architect'],
                    $budi->id => ['role_in_project' => 'Senior Architect'],
                    $dewi->id => ['role_in_project' => 'Interior Designer'],
                    $rizky->id => ['role_in_project' => 'Drafter'],
                ],
                'tasks' => [
                    ['title' => 'Studi KDB, KLB, dan GSB lahan Sudirman', 'stage' => 'Konsep', 'status' => 'done', 'priority' => 'high', 'assignee_id' => $admin->id],
                    ['title' => 'Konsep gubahan massa & analisa arah matahari', 'stage' => 'Konsep', 'status' => 'done', 'priority' => 'high', 'assignee_id' => $budi->id],
                    ['title' => 'Layout core lift, tangga darurat, dan parkir basement', 'stage' => 'Pra-Rancangan', 'status' => 'done', 'priority' => 'high', 'assignee_id' => $rizky->id],
                    ['title' => 'Desain sistem secondary skin fasad barat', 'stage' => 'Pra-Rancangan', 'status' => 'in_progress', 'priority' => 'high', 'assignee_id' => $budi->id],
                    ['title' => 'Konsep main lobby & drop-off area', 'stage' => 'Pra-Rancangan', 'status' => 'in_progress', 'priority' => 'medium', 'assignee_id' => $dewi->id],
                    ['title' => 'Koordinasi struktur kolom bentang lebar dengan konsultan sipil', 'stage' => 'DED', 'status' => 'todo', 'priority' => 'high', 'assignee_id' => $budi->id],
                    ['title' => 'Render perspektif malam hari (night view)', 'stage' => '3D Visualisasi', 'status' => 'todo', 'priority' => 'medium', 'assignee_id' => $rizky->id],
                ],
                'updates' => [
                    ['user_id' => $admin->id, 'content' => 'Presentasi pra-rancangan dengan direksi PT Graha Nusantara berjalan lancar, lanjut optimasi fasad sekunder.'],
                ],
            ],
            [
                'id' => 3,
                'name' => 'Kopi Senja Japandi',
                'client_name' => 'CV Senja Rasa',
                'client_phone' => '081234567803',
                'location' => 'Bandung',
                'category' => 'Interior',
                'cover_image_url' => '/project-covers/interior-kafe.png',
                'drive_url' => 'https://drive.google.com/drive/folders/rim-kopi-senja',
                'description' => 'Desain interior specialty coffee bar bergaya Japandi minimalis menggunakan material kayu jati dan batu alam ekspos.',
                'status' => 'review',
                'start_date' => Carbon::today()->subDays(45),
                'due_date' => Carbon::today()->addDays(3),
                'active_stage' => 'Konstruksi',
                'members' => [
                    $dewi->id => ['role_in_project' => 'Lead Architect'],
                    $andi->id => ['role_in_project' => '3D Visualizer'],
                ],
                'tasks' => [
                    ['title' => 'Moodboard material kayu oak, rotan, dan terrazzo', 'stage' => 'Konsep', 'status' => 'done', 'priority' => 'medium', 'assignee_id' => $dewi->id],
                    ['title' => 'Layout alur barista, mesin espresso, dan seating area', 'stage' => 'Pra-Rancangan', 'status' => 'done', 'priority' => 'high', 'assignee_id' => $dewi->id],
                    ['title' => 'Render 3D sudut komunal & meja bar kopi', 'stage' => '3D Visualisasi', 'status' => 'done', 'priority' => 'high', 'assignee_id' => $andi->id],
                    ['title' => 'Gambar kerja custom furniture meja bar & rak display', 'stage' => 'DED', 'status' => 'done', 'priority' => 'high', 'assignee_id' => $dewi->id],
                    ['title' => 'Detail pencahayaan warm indirect LED strip', 'stage' => 'DED', 'status' => 'done', 'priority' => 'medium', 'assignee_id' => $dewi->id],
                    ['title' => 'Supervisi pemasangan plafon kisi kayu lapangan', 'stage' => 'Konstruksi', 'status' => 'done', 'priority' => 'high', 'assignee_id' => $dewi->id],
                    ['title' => 'Inspeksi finishing coating meja bar terrazzo', 'stage' => 'Konstruksi', 'status' => 'done', 'priority' => 'medium', 'assignee_id' => $andi->id],
                    ['title' => 'Checklist defect list akhir bersama klien sebelum grand opening', 'stage' => 'Konstruksi', 'status' => 'review', 'priority' => 'high', 'assignee_id' => $dewi->id],
                ],
                'updates' => [
                    ['user_id' => $dewi->id, 'content' => 'Pekerjaan interior di lokasi Bandung sudah 88% rampung, tinggal serah terima final minggu ini.'],
                ],
            ],
            [
                'id' => 4,
                'name' => 'Villa Kabut Lembang',
                'client_name' => 'Ibu Larasati Putri',
                'client_phone' => '081234567804',
                'location' => 'Lembang',
                'category' => 'Residensial',
                'cover_image_url' => '/project-covers/villa-lembang.png',
                'drive_url' => 'https://drive.google.com/drive/folders/rim-villa-lembang',
                'description' => 'Resort villa kontur pegunungan dengan struktur baja ekspos, bukaan kaca penuh ke arah lembah pinus, dan dek kayu.',
                'status' => 'ongoing',
                'start_date' => Carbon::today()->subDays(20),
                'due_date' => Carbon::today()->addDays(61),
                'active_stage' => 'Konsep',
                'members' => [
                    $admin->id => ['role_in_project' => 'Lead Architect'],
                    $dewi->id => ['role_in_project' => 'Interior Designer'],
                    $siti->id => ['role_in_project' => 'Drafter'],
                ],
                'tasks' => [
                    ['title' => 'Survey topografi & pemetaan pohon pinus eksisting', 'stage' => 'Konsep', 'status' => 'done', 'priority' => 'high', 'assignee_id' => $admin->id],
                    ['title' => 'Studi orientasi bangunan terhadap view lembah & arah angin', 'stage' => 'Konsep', 'status' => 'done', 'priority' => 'high', 'assignee_id' => $admin->id],
                    ['title' => 'Eksplorasi sketsa gubahan massa panggung (split-level)', 'stage' => 'Konsep', 'status' => 'in_progress', 'priority' => 'high', 'assignee_id' => $admin->id],
                    ['title' => 'Konsep perapian (fireplace) & ruang keluarga kaca penuh', 'stage' => 'Konsep', 'status' => 'in_progress', 'priority' => 'medium', 'assignee_id' => $dewi->id],
                    ['title' => 'Draft denah lantai dasar & jalur dek kayu outdoor', 'stage' => 'Pra-Rancangan', 'status' => 'in_progress', 'priority' => 'medium', 'assignee_id' => $siti->id],
                    ['title' => 'Pemodelan 3D kontur lahan dengan SketchUp', 'stage' => '3D Visualisasi', 'status' => 'todo', 'priority' => 'medium', 'assignee_id' => $siti->id],
                    ['title' => 'Rencana struktur pondasi tiang pada tanah miring', 'stage' => 'DED', 'status' => 'todo', 'priority' => 'high', 'assignee_id' => $siti->id],
                    ['title' => 'Estimasi RAB awal pembangunan struktur & arsitektur', 'stage' => 'DED', 'status' => 'todo', 'priority' => 'low', 'assignee_id' => $admin->id],
                ],
                'updates' => [
                    ['user_id' => $admin->id, 'content' => 'Hasil ukur topografi Lembang telah diterima, konsep split-level mengikuti kemiringan alami lahan.'],
                ],
            ],
        ];

        foreach ($projectsData as $pData) {
            $project = Project::query()->updateOrCreate(
                ['id' => $pData['id']],
                [
                    'name' => $pData['name'],
                    'client_name' => $pData['client_name'],
                    'client_phone' => $pData['client_phone'],
                    'location' => $pData['location'],
                    'category' => $pData['category'],
                    'cover_image_url' => $pData['cover_image_url'],
                    'drive_url' => $pData['drive_url'],
                    'description' => $pData['description'],
                    'status' => $pData['status'],
                    'start_date' => $pData['start_date'],
                    'due_date' => $pData['due_date'],
                    'owner_id' => $admin->id,
                ]
            );

            // Sync stages
            $project->tasks()->delete();
            $project->stages()->delete();
            $project->updates()->delete();

            $activeIndex = array_search($pData['active_stage'], $stageTemplates, true);
            $stageMap = [];

            foreach ($stageTemplates as $idx => $stageName) {
                $stageStatus = 'pending';
                if ($activeIndex !== false) {
                    if ($idx < $activeIndex) {
                        $stageStatus = 'completed';
                    } elseif ($idx === $activeIndex) {
                        $stageStatus = 'active';
                    }
                }

                $stage = ProjectStage::query()->create([
                    'project_id' => $project->id,
                    'name' => $stageName,
                    'order' => $idx + 1,
                    'status' => $stageStatus,
                ]);
                $stageMap[$stageName] = $stage->id;
            }

            // Sync members
            $project->members()->sync($pData['members']);

            // Create tasks
            foreach ($pData['tasks'] as $order => $tData) {
                ProjectTask::query()->create([
                    'project_id' => $project->id,
                    'stage_id' => $stageMap[$tData['stage']] ?? null,
                    'assignee_id' => $tData['assignee_id'],
                    'title' => $tData['title'],
                    'status' => $tData['status'],
                    'priority' => $tData['priority'],
                    'order_column' => $order + 1,
                    'due_date' => $pData['due_date']->copy()->subDays(max(0, 5 - $order)),
                    'completed_at' => $tData['status'] === 'done' ? now()->subDays(rand(1, 10)) : null,
                ]);
            }

            // Create updates
            foreach ($pData['updates'] as $uData) {
                ProjectUpdate::query()->create([
                    'project_id' => $project->id,
                    'user_id' => $uData['user_id'],
                    'content' => $uData['content'],
                ]);
            }

            $project->recalculateProgress();
        }
    }
}
