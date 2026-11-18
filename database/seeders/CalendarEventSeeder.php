<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\CalendarEvent;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class CalendarEventSeeder extends Seeder
{
    /**
     * Seed studio calendar events linked to real projects and team members.
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

        $projCanggu = Project::query()->where('name', 'like', '%Canggu%')->first();
        $projSudirman = Project::query()->where('name', 'like', '%Sudirman%')->first();
        $projKopi = Project::query()->where('name', 'like', '%Kopi Senja%')->first();
        $projLembang = Project::query()->where('name', 'like', '%Lembang%')->first();

        $today = Carbon::today();

        $eventsData = [
            [
                'title' => 'Asistensi Denah & Fasad — Rumah Tropis Canggu',
                'description' => 'Pembahasan revisi akhir gambar kerja DED dan pemilihan material kayu ulin bersama Bpk. Hendra.',
                'location' => 'Studio Lt. 2 · Ruang Rapat',
                'type' => 'meeting',
                'start_at' => $today->copy()->setTime(9, 30),
                'end_at' => $today->copy()->setTime(10, 30),
                'is_all_day' => false,
                'project_id' => $projCanggu?->id,
                'participants' => [$admin->id, $budi->id, $siti->id],
            ],
            [
                'title' => 'Review Material Interior — Kopi Senja Japandi',
                'description' => 'Finalisasi sampel finishing kayu oak, terrazzo bar, dan pencahayaan warm LED sebelum serah terima.',
                'location' => 'Studio Lt. 1 · Area Sampel',
                'type' => 'milestone',
                'start_at' => $today->copy()->setTime(13, 30),
                'end_at' => $today->copy()->setTime(15, 0),
                'is_all_day' => false,
                'project_id' => $projKopi?->id,
                'participants' => [$dewi->id, $andi->id],
            ],
            [
                'title' => 'Koordinasi Struktur & MEP — Menara Sudirman',
                'description' => 'Sinkronisasi core lift dan jalur ducting AC bersama konsultan struktur.',
                'location' => 'Google Meet',
                'type' => 'meeting',
                'start_at' => $today->copy()->setTime(16, 0),
                'end_at' => $today->copy()->setTime(17, 0),
                'is_all_day' => false,
                'project_id' => $projSudirman?->id,
                'participants' => [$admin->id, $budi->id, $rizky->id],
            ],
            [
                'title' => 'Site Visit Progres Konstruksi — Kopi Senja Japandi',
                'description' => 'Pengecekan pemasangan plafon kisi kayu dan defect list akhir di lokasi.',
                'location' => 'Jl. Riau No. 45, Bandung',
                'type' => 'site_visit',
                'start_at' => $today->copy()->addDays(2)->setTime(10, 0),
                'end_at' => $today->copy()->addDays(2)->setTime(14, 0),
                'is_all_day' => false,
                'project_id' => $projKopi?->id,
                'participants' => [$dewi->id, $andi->id],
            ],
            [
                'title' => 'Presentasi Konsep Split-Level — Villa Kabut Lembang',
                'description' => 'Presentasi gubahan massa panggung dan hasil 3D kontur lahan kepada Ibu Larasati.',
                'location' => 'Studio Lt. 2 · Ruang Rapat',
                'type' => 'milestone',
                'start_at' => $today->copy()->addDays(4)->setTime(14, 0),
                'end_at' => $today->copy()->addDays(4)->setTime(15, 30),
                'is_all_day' => false,
                'project_id' => $projLembang?->id,
                'participants' => [$admin->id, $dewi->id, $siti->id],
            ],
            [
                'title' => 'Rapat Mingguan Evaluasi Studio RIM',
                'description' => 'Review beban kerja mingguan tim arsitek, drafter, dan jadwal asistensi klien.',
                'location' => 'Studio Utama Lt. 2',
                'type' => 'meeting',
                'start_at' => $today->copy()->addDays(6)->setTime(9, 0),
                'end_at' => $today->copy()->addDays(6)->setTime(10, 0),
                'is_all_day' => false,
                'project_id' => null,
                'participants' => [$admin->id, $budi->id, $siti->id, $andi->id, $dewi->id, $rizky->id],
            ],
            [
                'title' => 'Libur Studio — Hari Cuti Bersama',
                'description' => 'Operasional studio libur, tidak ada jadwal asistensi kantor.',
                'location' => 'Studio Tutup',
                'type' => 'holiday',
                'start_at' => $today->copy()->addDays(10)->startOfDay(),
                'end_at' => $today->copy()->addDays(10)->endOfDay(),
                'is_all_day' => true,
                'project_id' => null,
                'participants' => [],
            ],
        ];

        foreach ($eventsData as $data) {
            $participants = $data['participants'];
            unset($data['participants']);

            $event = CalendarEvent::query()->updateOrCreate(
                ['title' => $data['title']],
                [
                    ...$data,
                    'created_by' => $admin->id,
                ]
            );

            $event->participants()->sync(array_unique($participants));
        }
    }
}
