<?php

namespace App\Console\Commands;

use App\Models\ActivityLog;
use App\Models\Attendance;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

#[Signature('attendance:auto-close')]
#[Description('Tutup otomatis sesi presensi yang lupa check-out (dijalankan tiap 23:59) dan tandai untuk konfirmasi karyawan.')]
class AutoCloseAttendances extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $unclosed = Attendance::query()
            ->with('user.employee')
            ->whereDate('date', '<=', Carbon::today())
            ->whereNotNull('check_in_at')
            ->whereNull('check_out_at')
            ->get();

        foreach ($unclosed as $attendance) {
            $targetMinutes = $attendance->target_work_minutes ?: ($attendance->user?->dailyTargetWorkMinutes() ?? 540);

            $attendance->update([
                'check_out_at' => $attendance->check_in_at->copy()->addMinutes($targetMinutes),
                'actual_work_minutes' => $targetMinutes,
                'shortage_minutes' => 0,
                'is_auto_closed' => true,
                'notes' => trim(($attendance->notes ? "{$attendance->notes} | " : '').'[Auto-Close] Lupa check-out, menunggu konfirmasi jam pulang.'),
            ]);

            ActivityLog::record(
                action: 'attendance.auto_closed',
                description: "Sistem menutup otomatis presensi tanggal {$attendance->date->format('Y-m-d')} (lupa check-out)",
                reference: $attendance,
            );
        }

        $this->info("{$unclosed->count()} sesi presensi ditutup otomatis.");

        return self::SUCCESS;
    }
}
