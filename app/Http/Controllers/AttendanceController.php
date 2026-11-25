<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\LeaveRequest;
use App\Models\OfficeSetting;
use App\Models\Overtime;
use App\Models\Project;
use App\Models\User;
use Carbon\CarbonPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendanceController extends Controller
{
    /**
     * Display the personal attendance & overtime page (/attendance).
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user()->loadMissing('employee');
        if ($user->isFreelancer() && ! $user->isAdmin()) {
            return redirect()->route('dashboard');
        }

        $today = Carbon::today();
        $officeSetting = OfficeSetting::current();

        $todayAttendance = Attendance::query()
            ->with(['siteVisitProject:id,name', 'overtimes.project:id,name'])
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        $unclosedPastAttendance = Attendance::query()
            ->with('siteVisitProject:id,name')
            ->where('user_id', $user->id)
            ->whereDate('date', '<', $today)
            ->whereNotNull('check_in_at')
            ->where(function ($q): void {
                $q->whereNull('check_out_at')
                    ->orWhere('is_auto_closed', true);
            })
            ->latest('date')
            ->first();

        $activeOvertime = Overtime::query()
            ->with('project:id,name')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->latest('start_at')
            ->first();

        $history = Attendance::query()
            ->with('siteVisitProject:id,name')
            ->where('user_id', $user->id)
            ->orderByDesc('date')
            ->take(30)
            ->get()
            ->map(fn (Attendance $att) => $this->formatAttendance($att));

        $leaveRequests = LeaveRequest::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (LeaveRequest $lr) => [
                'id' => $lr->id,
                'type' => $lr->type,
                'start_date' => $lr->start_date->format('Y-m-d'),
                'end_date' => $lr->end_date->format('Y-m-d'),
                'total_days' => $lr->total_days,
                'reason' => $lr->reason,
                'status' => $lr->status,
                'rejection_reason' => $lr->rejection_reason,
                'created_at' => $lr->created_at?->format('Y-m-d H:i'),
            ]);

        $annualQuota = $user->employee?->annual_leave_quota ?? 12;
        $usedCutiDays = (int) LeaveRequest::query()
            ->where('user_id', $user->id)
            ->where('type', 'cuti')
            ->where('status', 'approved')
            ->whereYear('start_date', $today->year)
            ->sum('total_days');

        $projectsQuery = Project::query()
            ->whereIn('status', ['planning', 'ongoing', 'review'])
            ->select(['id', 'name', 'location', 'client_name', 'project_type']);

        if (! $user->isAdmin()) {
            if ($user->isFieldWorker()) {
                $projectsQuery->whereIn('project_type', Project::FIELD_TYPES);
            } else {
                $projectsQuery->whereIn('project_type', ['perencanaan', 'desain_bangun']);
            }
        }

        $projects = $projectsQuery
            ->orderByRaw("CASE WHEN project_type IN ('pembangunan', 'desain_bangun') THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get()
            ->map(fn (Project $p): array => [
                'id' => $p->id,
                'name' => $p->name,
                'location' => $p->location,
                'client_name' => $p->client_name,
                'project_type' => $p->project_type ?? 'perencanaan',
                'group' => $p->hasFieldSite() ? 'lapangan' : 'perencanaan',
            ])
            ->values();

        return Inertia::render('Attendance/Index', [
            'todayAttendance' => $todayAttendance ? $this->formatAttendance($todayAttendance) : null,
            'unclosedPastAttendance' => $unclosedPastAttendance ? $this->formatAttendance($unclosedPastAttendance) : null,
            'activeOvertime' => $activeOvertime ? [
                'id' => $activeOvertime->id,
                'project_id' => $activeOvertime->project_id,
                'project_name' => $activeOvertime->project?->name ?? 'Proyek Studio',
                'task_description' => $activeOvertime->task_description,
                'start_at' => $activeOvertime->start_at->toIso8601String(),
                'elapsed_seconds' => max(0, (int) $activeOvertime->start_at->diffInSeconds(now())),
                'status' => $activeOvertime->status,
            ] : null,
            'history' => $history,
            'leaveRequests' => $leaveRequests,
            'leaveQuota' => [
                'annual_quota' => $annualQuota,
                'used_days' => $usedCutiDays,
                'remaining_days' => max(0, $annualQuota - $usedCutiDays),
            ],
            'projects' => $projects,
            'officeSetting' => [
                'office_name' => $officeSetting->office_name,
                'latitude' => (float) $officeSetting->latitude,
                'longitude' => (float) $officeSetting->longitude,
                'radius_meters' => $officeSetting->radius_meters,
                'standard_work_hours' => $user->dailyTargetWorkHours(),
                'overtime_cooldown_minutes' => $officeSetting->overtime_cooldown_minutes,
            ],
            'isWeekendToday' => $user->isOffDay($today),
            'canSimulateWeekend' => app()->isLocal(),
            'todayDate' => $today->format('Y-m-d'),
        ]);
    }

    /**
     * Perform daily check-in (Office GPS or Site Visit, with Weekend Compensation support).
     */
    public function checkIn(Request $request): RedirectResponse
    {
        $user = $request->user();
        $today = Carbon::today();
        $officeSetting = OfficeSetting::current();

        $existing = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        if ($existing && in_array($existing->status, ['ganti_hari', 'izin', 'cuti', 'sakit'], true)) {
            return redirect()->back()->with(
                'error',
                "Absensi hari ini terkunci otomatis karena Anda sedang terdaftar {$existing->status}.",
            );
        }

        if ($existing && $existing->check_in_at && ! $existing->check_out_at) {
            return redirect()->back()->with('error', 'Anda sudah melakukan check-in hari ini.');
        }

        if ($existing && $existing->check_in_at && $existing->check_out_at) {
            return redirect()->back()->with(
                'error',
                'Presensi hari ini sudah selesai (Check-in & Check-out tercatat). Gunakan menu "Lupa Absen / Koreksi Jam" jika perlu penyesuaian.',
            );
        }

        $earliestCheckIn = $today->copy()->setTime(8, 0, 0);
        if (now()->lt($earliestCheckIn)) {
            return redirect()->back()->with(
                'error',
                'Check-in baru dibuka tepat pukul 08:00 WIB (jam sekarang: '.now()->format('H:i').' WIB).',
            );
        }

        $validated = $request->validate([
            'mode' => ['required', Rule::in(['office', 'site_visit', 'wfh'])],
            'distance_meters' => ['nullable', 'integer', 'min:0'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'site_visit_project_id' => ['required_if:mode,site_visit', 'nullable', 'exists:projects,id'],
            'site_visit_photo' => ['required_if:mode,site_visit', 'nullable', 'image', 'max:5120'],
            'notes' => ['nullable', 'string', 'max:500'],
            'is_weekend' => ['nullable', 'boolean'],
            'compensation_type' => ['nullable', Rule::in(['none', 'overtime', 'day_off_exchange'])],
            'exchange_date' => ['required_if:compensation_type,day_off_exchange', 'nullable', 'date', 'after:today'],
        ], [
            'site_visit_project_id.required_if' => 'Proyek tujuan Site Visit wajib dipilih.',
            'site_visit_photo.required_if' => 'Foto bukti lokasi wajib diambil atau dilampirkan untuk absen Site Visit.',
            'site_visit_photo.image' => 'Lampiran Site Visit harus berupa file gambar (JPG, PNG, WebP).',
        ]);

        if ($validated['mode'] === 'site_visit' && ! empty($validated['site_visit_project_id']) && $user->isFieldWorker()) {
            $siteProject = Project::query()->find($validated['site_visit_project_id']);
            if ($siteProject && ! $siteProject->hasFieldSite()) {
                return redirect()->back()->with(
                    'error',
                    'Karyawan lapangan hanya dapat Site Visit ke proyek Pembangunan / Desain & Bangun yang sedang berjalan.',
                );
            }
        }

        $hasCoords = isset($validated['latitude'], $validated['longitude']);
        $distance = null;
        $approvedWfh = null;

        if ($validated['mode'] === 'wfh') {
            $approvedWfh = LeaveRequest::query()
                ->where('user_id', $user->id)
                ->where('type', 'wfh')
                ->where('status', 'approved')
                ->whereDate('start_date', '<=', $today)
                ->whereDate('end_date', '>=', $today)
                ->latest('approved_at')
                ->first();

            if (! $approvedWfh) {
                return redirect()->back()->with(
                    'error',
                    'Mode WFH hanya dapat digunakan jika pengajuan Izin WFH untuk hari ini sudah disetujui Super Admin.',
                );
            }

            if ($hasCoords) {
                $distance = $this->calculateHaversineMeters(
                    (float) $validated['latitude'],
                    (float) $validated['longitude'],
                    (float) $officeSetting->latitude,
                    (float) $officeSetting->longitude,
                );
            }
        }

        if ($validated['mode'] === 'office') {
            if (! $hasCoords && ! isset($validated['distance_meters'])) {
                return redirect()->back()->with(
                    'error',
                    'Izin lokasi (GPS) browser wajib diaktifkan untuk Check-in Kantor. Silakan izinkan akses lokasi lalu coba lagi.',
                );
            }

            $distance = $hasCoords
                ? $this->calculateHaversineMeters(
                    (float) $validated['latitude'],
                    (float) $validated['longitude'],
                    (float) $officeSetting->latitude,
                    (float) $officeSetting->longitude,
                )
                : (int) $validated['distance_meters'];

            if ($distance > $officeSetting->radius_meters) {
                return redirect()->back()->with(
                    'error',
                    "Jarak Anda ({$distance}m) berada di luar radius kantor ({$officeSetting->radius_meters}m).",
                );
            }
        }

        $isWeekend = $user->isOffDay($today) || (app()->isLocal() && $request->boolean('is_weekend'));
        $compensationType = $isWeekend ? ($validated['compensation_type'] ?? 'overtime') : 'none';

        $siteVisitPhotoUrl = null;
        if ($validated['mode'] === 'site_visit' && $request->hasFile('site_visit_photo')) {
            $dir = public_path('uploads/site-visits');
            if (! File::isDirectory($dir)) {
                File::makeDirectory($dir, 0755, true);
            }
            $file = $request->file('site_visit_photo');
            $ext = $file->guessExtension() ?: 'jpg';
            $filename = 'site_visit_'.$user->id.'_'.$today->format('Ymd').'_'.time().'.'.$ext;
            $file->move($dir, $filename);
            $siteVisitPhotoUrl = "/uploads/site-visits/{$filename}";
        }

        $checkInNotes = $validated['notes'] ?? ($approvedWfh ? "WFH (Disetujui): {$approvedWfh->reason}" : null);

        $attendance = $this->upsertAttendanceForDate($user->id, $today, [
            'mode' => $validated['mode'],
            'is_weekend' => $isWeekend,
            'compensation_type' => $compensationType,
            'exchange_date' => $compensationType === 'day_off_exchange' ? ($validated['exchange_date'] ?? null) : null,
            'compensation_status' => $isWeekend ? 'pending' : 'none',
            'check_in_at' => now(),
            'check_out_at' => null,
            'check_in_lat' => $validated['latitude'] ?? ($validated['mode'] === 'wfh' ? null : $officeSetting->latitude),
            'check_in_lng' => $validated['longitude'] ?? ($validated['mode'] === 'wfh' ? null : $officeSetting->longitude),
            'check_in_distance_meters' => in_array($validated['mode'], ['office', 'wfh'], true) ? $distance : null,
            'target_work_minutes' => $user->dailyTargetWorkMinutes(),
            'actual_work_minutes' => null,
            'shortage_minutes' => 0,
            'status' => $validated['mode'] === 'site_visit' ? 'site_visit' : 'hadir',
            'site_visit_project_id' => $validated['mode'] === 'site_visit' ? $validated['site_visit_project_id'] : null,
            'site_visit_photo_url' => $validated['mode'] === 'site_visit' ? $siteVisitPhotoUrl : null,
            'site_visit_status' => $validated['mode'] === 'site_visit' ? 'pending' : 'none',
            'notes' => $checkInNotes,
        ]);

        $modeLabel = match ($validated['mode']) {
            'site_visit' => 'Site Visit',
            'wfh' => 'WFH',
            default => 'Kantor',
        };
        ActivityLog::record(
            action: 'attendance.checkin',
            description: "{$user->name} melakukan check-in ({$modeLabel})",
            reference: $attendance,
            user: $user,
        );

        return redirect()->back()->with('success', "Berhasil check-in mode {$modeLabel} pada ".now()->format('H:i').' WIB.');
    }

    /**
     * Perform daily check-out and calculate target completion / shortage minutes.
     * Office check-ins require being inside office GPS radius unless checking out from a Site Visit with photo proof.
     */
    public function checkOut(Request $request): RedirectResponse
    {
        $user = $request->user();
        $today = Carbon::today();

        $attendance = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->whereNotNull('check_in_at')
            ->firstOrFail();

        $validated = $request->validate([
            'simulated_minutes' => ['nullable', 'integer', 'min:0'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'distance_meters' => ['nullable', 'integer', 'min:0'],
            'checkout_site_visit' => ['nullable', 'boolean'],
            'site_visit_project_id' => ['required_if:checkout_site_visit,1,true', 'nullable', 'exists:projects,id'],
            'site_visit_photo' => ['required_if:checkout_site_visit,1,true', 'nullable', 'image', 'max:5120'],
            'notes' => ['nullable', 'string', 'max:500'],
        ], [
            'site_visit_project_id.required_if' => 'Proyek tujuan Site Visit wajib dipilih untuk check-out luar kantor.',
            'site_visit_photo.required_if' => 'Foto bukti lokasi Site Visit wajib diambil atau dilampirkan untuk check-out luar kantor.',
            'site_visit_photo.image' => 'Bukti lokasi harus berupa file gambar (JPG, PNG, WebP).',
        ]);

        $isCheckoutSiteVisit = $request->boolean('checkout_site_visit');

        if ($attendance->mode === 'office' && ! $isCheckoutSiteVisit) {
            $officeSetting = OfficeSetting::current();
            $hasCoords = isset($validated['latitude'], $validated['longitude']);

            if (! $hasCoords && ! isset($validated['distance_meters'])) {
                return redirect()->back()->with(
                    'error',
                    'Izin lokasi (GPS) browser wajib diaktifkan untuk Check-out Kantor, atau gunakan opsi "Pulang dari Site Visit" dengan foto bukti lokasi.',
                );
            }

            $distance = $hasCoords
                ? $this->calculateHaversineMeters(
                    (float) $validated['latitude'],
                    (float) $validated['longitude'],
                    (float) $officeSetting->latitude,
                    (float) $officeSetting->longitude,
                )
                : (int) $validated['distance_meters'];

            if ($distance > $officeSetting->radius_meters) {
                return redirect()->back()->with(
                    'error',
                    "Jarak Anda ({$distance}m) di luar radius kantor ({$officeSetting->radius_meters}m). Check-out kantor wajib di area studio, atau gunakan opsi 'Pulang dari Site Visit' dengan foto bukti lokasi.",
                );
            }
        }

        $checkOutAt = now();
        $elapsedMinutes = max(1, (int) $attendance->check_in_at->diffInMinutes($checkOutAt));
        $actualMinutes = max(1, $request->integer('simulated_minutes', $elapsedMinutes));
        $targetMinutes = $attendance->target_work_minutes ?: $user->dailyTargetWorkMinutes();
        $shortageMinutes = $attendance->is_weekend ? 0 : max(0, $targetMinutes - $actualMinutes);

        $status = $attendance->mode === 'site_visit'
            ? 'site_visit'
            : ($shortageMinutes > 0 ? 'kurang_jam' : 'hadir');

        $updateData = [
            'check_out_at' => $checkOutAt,
            'actual_work_minutes' => $actualMinutes,
            'shortage_minutes' => $shortageMinutes,
            'status' => $status,
        ];

        if ($isCheckoutSiteVisit) {
            $siteVisitPhotoUrl = $attendance->site_visit_photo_url;
            if ($request->hasFile('site_visit_photo')) {
                $dir = public_path('uploads/site-visits');
                if (! File::isDirectory($dir)) {
                    File::makeDirectory($dir, 0755, true);
                }
                $file = $request->file('site_visit_photo');
                $ext = $file->guessExtension() ?: 'jpg';
                $filename = 'site_visit_checkout_'.$user->id.'_'.$today->format('Ymd').'_'.time().'.'.$ext;
                $file->move($dir, $filename);
                $siteVisitPhotoUrl = "/uploads/site-visits/{$filename}";
            }

            $extraNote = trim((string) ($validated['notes'] ?? ''));
            $checkoutNote = $extraNote !== ''
                ? "[Pulang dari Site Visit] {$extraNote}"
                : '[Pulang dari Site Visit] Check-out langsung dari lokasi proyek.';

            $updateData['site_visit_project_id'] = (int) $validated['site_visit_project_id'];
            $updateData['site_visit_photo_url'] = $siteVisitPhotoUrl;
            $updateData['site_visit_status'] = 'pending';
            $updateData['notes'] = $attendance->notes
                ? "{$attendance->notes} | {$checkoutNote}"
                : $checkoutNote;
        }

        $attendance->update($updateData);

        if ($attendance->is_weekend && $attendance->compensation_type === 'overtime') {
            Overtime::query()->create([
                'attendance_id' => $attendance->id,
                'user_id' => $user->id,
                'project_id' => $attendance->site_visit_project_id,
                'source' => 'weekend',
                'start_at' => $attendance->check_in_at,
                'end_at' => $checkOutAt,
                'duration_minutes' => $actualMinutes,
                'task_description' => $attendance->notes ?: 'Lembur kerja akhir pekan (Sabtu/Minggu)',
                'status' => 'pending',
            ]);
        }

        ActivityLog::record(
            action: 'attendance.checkout',
            description: $isCheckoutSiteVisit
                ? "{$user->name} melakukan check-out dari Site Visit luar kantor (Durasi: {$actualMinutes} menit · menunggu approval foto)"
                : "{$user->name} melakukan check-out (Durasi: {$actualMinutes} menit)",
            reference: $attendance,
            user: $user,
        );

        return redirect()->back()->with(
            'success',
            $isCheckoutSiteVisit
                ? 'Check-out dari Site Visit berhasil dicatat dan foto bukti telah dikirim ke Pusat Approval!'
                : 'Check-out berhasil dicatat. Terima kasih atas kerja keras Anda hari ini!',
        );
    }

    /**
     * Start an evening overtime session linked to a project.
     */
    public function startOvertime(Request $request): RedirectResponse
    {
        $user = $request->user();
        $today = Carbon::today();

        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'task_description' => ['required', 'string', 'max:500'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
        ]);

        $todayAttendance = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        $officeSetting = OfficeSetting::current();
        $isRemoteMode = in_array($todayAttendance?->mode, ['site_visit', 'wfh'], true);

        if (! $isRemoteMode && isset($validated['latitude'], $validated['longitude'])) {
            $distance = $this->calculateHaversineMeters(
                (float) $validated['latitude'],
                (float) $validated['longitude'],
                (float) $officeSetting->latitude,
                (float) $officeSetting->longitude,
            );

            if ($distance > $officeSetting->radius_meters) {
                return redirect()->back()->with(
                    'error',
                    "Jarak Anda ({$distance}m) berada di luar radius kantor ({$officeSetting->radius_meters}m). Lembur kantor hanya dapat dimulai di dalam area studio.",
                );
            }
        }

        $lock = Cache::lock("overtime-start:{$user->id}", 5);
        if (! $lock->get()) {
            return redirect()->back()->with('error', 'Permintaan lembur sedang diproses. Mohon tunggu sebentar.');
        }

        try {
            if ($blockReason = $this->validateCanStartOvertime($user, $today, $todayAttendance)) {
                return redirect()->back()->with('error', $blockReason);
            }

            $overtime = Overtime::query()->create([
                'attendance_id' => $todayAttendance?->id,
                'user_id' => $user->id,
                'project_id' => $validated['project_id'],
                'source' => 'regular',
                'start_at' => now(),
                'task_description' => $validated['task_description'],
                'status' => 'active',
            ]);
        } finally {
            $lock->release();
        }

        ActivityLog::record(
            action: 'overtime.started',
            description: "{$user->name} memulai sesi lembur proyek",
            reference: $overtime,
            user: $user,
        );

        return redirect()->back()->with('success', 'Sesi lembur dimulai. Timer lembur sedang berjalan.');
    }

    /**
     * Stop an active overtime session and submit it for admin approval.
     */
    public function stopOvertime(Request $request, Overtime $overtime): RedirectResponse
    {
        $user = $request->user();
        if ($overtime->user_id !== $user->id) {
            abort(403);
        }

        $endAt = now();
        $elapsedMinutes = max(15, (int) $overtime->start_at->diffInMinutes($endAt));
        $durationMinutes = $request->integer('duration_minutes', $elapsedMinutes);

        $overtime->update([
            'end_at' => $endAt,
            'duration_minutes' => $durationMinutes,
            'status' => 'pending',
        ]);

        ActivityLog::record(
            action: 'overtime.submitted',
            description: "{$user->name} menyelesaikan lembur ({$durationMinutes} menit) — menunggu approval",
            reference: $overtime,
            user: $user,
        );

        return redirect()->back()->with('success', "Sesi lembur selesai ({$durationMinutes} menit) dan dikirim ke Pusat Approval Admin.");
    }

    /**
     * Submit a new leave / sick / annual vacation request.
     */
    public function storeLeaveRequest(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'type' => ['required', Rule::in(['izin', 'cuti', 'sakit', 'wfh'])],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $period = CarbonPeriod::create($validated['start_date'], $validated['end_date']);
        $totalDays = 0;
        foreach ($period as $date) {
            if (! $user->isOffDay(Carbon::instance($date))) {
                $totalDays++;
            }
        }
        $totalDays = max(1, $totalDays);

        $lock = Cache::lock("leave-store:{$user->id}", 5);
        if (! $lock->get()) {
            return redirect()->back()->with('error', 'Pengajuan izin/cuti sedang diproses. Mohon tunggu sebentar.');
        }

        try {
            $leave = LeaveRequest::query()->create([
                'user_id' => $user->id,
                'type' => $validated['type'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'total_days' => $totalDays,
                'reason' => $validated['reason'],
                'status' => 'pending',
            ]);
        } finally {
            $lock->release();
        }

        $typeLabel = $validated['type'] === 'wfh' ? 'Izin WFH' : $validated['type'];
        ActivityLog::record(
            action: 'leave.requested',
            description: "{$user->name} mengajukan {$typeLabel} ({$totalDays} hari)",
            reference: $leave,
            user: $user,
        );

        if ($validated['type'] === 'wfh') {
            return redirect()->back()->with(
                'success',
                "Permohonan Izin WFH ({$totalDays} hari) berhasil dikirim ke Pusat Approval Super Admin. Mode Check-in WFH akan otomatis terbuka setelah disetujui.",
            );
        }

        return redirect()->back()->with('success', "Permohonan {$validated['type']} ({$totalDays} hari) berhasil diajukan.");
    }

    /**
     * Submit an attendance adjustment request (e.g. forgot check-in, forgot check-out, or full day missing).
     */
    public function requestAdjustment(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'adjustment_type' => ['required', Rule::in(['check_in', 'check_out', 'full_day'])],
            'date' => ['required', 'date', 'before_or_equal:today'],
            'adjusted_check_in_time' => ['nullable', 'date_format:H:i'],
            'adjusted_check_out_time' => ['nullable', 'date_format:H:i'],
            'notes' => ['required', 'string', 'max:500'],
        ]);

        $dateStr = Carbon::parse($validated['date'])->format('Y-m-d');
        $type = $validated['adjustment_type'];

        $adjustedIn = in_array($type, ['check_in', 'full_day'], true) && ! empty($validated['adjusted_check_in_time'])
            ? Carbon::parse("{$dateStr} {$validated['adjusted_check_in_time']}")
            : null;
        $adjustedOut = in_array($type, ['check_out', 'full_day'], true) && ! empty($validated['adjusted_check_out_time'])
            ? Carbon::parse("{$dateStr} {$validated['adjusted_check_out_time']}")
            : null;

        $attendance = $this->upsertAttendanceForDate($user->id, $dateStr, [
            'adjustment_type' => $validated['adjustment_type'],
            'adjustment_status' => 'pending',
            'adjusted_check_in_at' => $adjustedIn,
            'adjusted_check_out_at' => $adjustedOut,
            'adjustment_reason' => $validated['notes'],
        ]);

        ActivityLog::record(
            action: 'attendance.adjustment_requested',
            description: "{$user->name} mengajukan koreksi presensi ({$validated['adjustment_type']}) untuk tanggal {$dateStr}",
            reference: $attendance,
            user: $user,
        );

        return redirect()->back()->with('success', 'Pengajuan koreksi presensi berhasil dikirim ke Pusat Approval Admin.');
    }

    /**
     * Confirm actual checkout time for past unclosed attendance (forgot checkout yesterday/past).
     */
    public function confirmCheckout(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'attendance_id' => ['required', 'exists:attendances,id'],
            'check_out_time' => ['required', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $attendance = Attendance::query()
            ->where('id', $validated['attendance_id'])
            ->where('user_id', $user->id)
            ->firstOrFail();

        $dateStr = $attendance->date->format('Y-m-d');
        $checkOutAt = Carbon::parse("{$dateStr} {$validated['check_out_time']}");

        if ($attendance->check_in_at && $checkOutAt->lt($attendance->check_in_at)) {
            $checkOutAt = $checkOutAt->addDay();
        }

        $defaultTargetMinutes = $user->dailyTargetWorkMinutes();
        $actualMinutes = $attendance->check_in_at
            ? max(1, (int) $attendance->check_in_at->diffInMinutes($checkOutAt))
            : $defaultTargetMinutes;

        $targetMinutes = $attendance->target_work_minutes ?: $defaultTargetMinutes;
        $shortageMinutes = $attendance->is_weekend ? 0 : max(0, $targetMinutes - $actualMinutes);
        $status = $shortageMinutes > 0 ? 'kurang_jam' : 'hadir';

        $attendance->update([
            'check_out_at' => $checkOutAt,
            'actual_work_minutes' => $actualMinutes,
            'shortage_minutes' => $shortageMinutes,
            'status' => $status,
            'is_auto_closed' => false,
            'notes' => $validated['notes']
                ? ($attendance->notes ? "{$attendance->notes} | {$validated['notes']}" : $validated['notes'])
                : $attendance->notes,
        ]);

        ActivityLog::record(
            action: 'attendance.confirmed_checkout',
            description: "{$user->name} mengonfirmasi jam pulang tanggal {$dateStr} ({$validated['check_out_time']} WIB)",
            reference: $attendance,
            user: $user,
        );

        return redirect()->back()->with('success', "Konfirmasi jam pulang tanggal {$dateStr} berhasil disimpan ({$validated['check_out_time']} WIB).");
    }

    /**
     * Check out regular hours (exact 9 hours) and directly transition to active evening overtime.
     */
    public function checkoutAndOvertime(Request $request): RedirectResponse
    {
        $user = $request->user();
        $today = Carbon::today();

        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'task_description' => ['required', 'string', 'max:500'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'distance_meters' => ['nullable', 'integer', 'min:0'],
        ]);

        $attendance = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->whereNotNull('check_in_at')
            ->firstOrFail();

        if ($attendance->mode === 'office') {
            $officeSetting = OfficeSetting::current();
            $hasCoords = isset($validated['latitude'], $validated['longitude']);

            if ($hasCoords || isset($validated['distance_meters'])) {
                $distance = $hasCoords
                    ? $this->calculateHaversineMeters(
                        (float) $validated['latitude'],
                        (float) $validated['longitude'],
                        (float) $officeSetting->latitude,
                        (float) $officeSetting->longitude,
                    )
                    : (int) $validated['distance_meters'];

                if ($distance > $officeSetting->radius_meters) {
                    return redirect()->back()->with(
                        'error',
                        "Jarak Anda ({$distance}m) di luar radius kantor ({$officeSetting->radius_meters}m). Check-out & Langsung Lembur hanya tersedia jika GPS terdeteksi masih di dalam kantor.",
                    );
                }
            }
        }

        if ($blockReason = $this->validateCanStartOvertime($user, $today, $attendance)) {
            return redirect()->back()->with('error', $blockReason);
        }

        $targetMinutes = $attendance->target_work_minutes ?: $user->dailyTargetWorkMinutes();
        $elapsedFromCheckIn = (int) $attendance->check_in_at->diffInMinutes(now());

        if ($elapsedFromCheckIn < $targetMinutes) {
            $targetHours = round($targetMinutes / 60, 1);

            return redirect()->back()->with(
                'error',
                "Fitur Check-out & Langsung Lembur hanya tersedia jika Anda sudah melewati jam pulang reguler ({$targetHours} jam) dan lupa check-out.",
            );
        }

        // Cap regular work at target 9 hours if user has exceeded it
        $regCheckOutAt = $elapsedFromCheckIn >= $targetMinutes
            ? $attendance->check_in_at->copy()->addMinutes($targetMinutes)
            : now();

        $actualMinutes = (int) $attendance->check_in_at->diffInMinutes($regCheckOutAt);
        $shortageMinutes = max(0, $targetMinutes - $actualMinutes);

        $attendance->update([
            'check_out_at' => $regCheckOutAt,
            'actual_work_minutes' => $actualMinutes,
            'shortage_minutes' => $shortageMinutes,
            'status' => $shortageMinutes > 0 ? 'kurang_jam' : 'hadir',
        ]);

        // Break cooldown: 60 minutes after regular checkout
        $cooldownEnd = $regCheckOutAt->copy()->addHour();

        // If 1 hour cooldown has physically passed, overtime starts at cooldownEnd or now
        $otStartAt = $cooldownEnd->lte(now()) ? $cooldownEnd : now();

        $overtime = Overtime::query()->create([
            'attendance_id' => $attendance->id,
            'user_id' => $user->id,
            'project_id' => $validated['project_id'],
            'source' => 'regular',
            'start_at' => $otStartAt,
            'task_description' => $validated['task_description'],
            'status' => 'active',
        ]);

        ActivityLog::record(
            action: 'overtime.direct_split',
            description: "{$user->name} menyelesaikan kerja reguler (9 Jam Penuh) dan langsung mulai lembur proyek",
            reference: $overtime,
            user: $user,
        );

        return redirect()->back()->with(
            'success',
            'Check-out reguler berhasil dicatat (9 Jam Penuh) dan sesi lembur malam langsung aktif!'
        );
    }

    /**
     * Display the Admin Approval Center (/attendance/approvals) with 3 tabs.
     */
    public function approvals(): Response
    {
        $siteVisits = Attendance::query()
            ->with(['user.employee', 'siteVisitProject:id,name,location'])
            ->where(function ($q): void {
                $q->where('mode', 'site_visit')
                    ->orWhere('is_weekend', true)
                    ->orWhere('site_visit_status', '!=', 'none');
            })
            ->orderByRaw("CASE WHEN site_visit_status = 'pending' OR compensation_status = 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('date')
            ->get()
            ->map(fn (Attendance $att) => [
                ...$this->formatAttendance($att),
                'user_name' => $att->user?->name ?? 'Karyawan',
                'employee_code' => $att->user?->employee?->employee_code ?? 'RIM-000',
                'position' => $att->user?->employee?->position ?? 'Arsitek',
            ]);

        $leaveRequests = LeaveRequest::query()
            ->with('user.employee')
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (LeaveRequest $lr) => [
                'id' => $lr->id,
                'user_id' => $lr->user_id,
                'user_name' => $lr->user?->name ?? 'Karyawan',
                'employee_code' => $lr->user?->employee?->employee_code ?? 'RIM-000',
                'position' => $lr->user?->employee?->position ?? 'Arsitek',
                'annual_leave_quota' => $lr->user?->employee?->annual_leave_quota ?? 12,
                'type' => $lr->type,
                'start_date' => $lr->start_date->format('Y-m-d'),
                'end_date' => $lr->end_date->format('Y-m-d'),
                'total_days' => $lr->total_days,
                'reason' => $lr->reason,
                'status' => $lr->status,
                'rejection_reason' => $lr->rejection_reason,
                'created_at' => $lr->created_at?->format('Y-m-d H:i'),
            ]);

        $overtimes = Overtime::query()
            ->with(['user.employee', 'project:id,name'])
            ->whereIn('status', ['pending', 'approved', 'rejected'])
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('start_at')
            ->get()
            ->map(fn (Overtime $ot) => [
                'id' => $ot->id,
                'user_id' => $ot->user_id,
                'user_name' => $ot->user?->name ?? 'Karyawan',
                'employee_code' => $ot->user?->employee?->employee_code ?? 'RIM-000',
                'position' => $ot->user?->employee?->position ?? 'Arsitek',
                'project_name' => $ot->project?->name ?? 'Proyek Studio',
                'source' => $ot->source,
                'date' => $ot->start_at->format('Y-m-d'),
                'start_time' => $ot->start_at->format('H:i'),
                'end_time' => $ot->end_at?->format('H:i') ?? '—',
                'duration_minutes' => $ot->duration_minutes ?? 60,
                'task_description' => $ot->task_description,
                'status' => $ot->status,
            ]);

        $adjustments = Attendance::query()
            ->with(['user.employee'])
            ->where('adjustment_status', '!=', 'none')
            ->orderByRaw("CASE WHEN adjustment_status = 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('date')
            ->get()
            ->map(fn (Attendance $att) => [
                ...$this->formatAttendance($att),
                'user_name' => $att->user?->name ?? 'Karyawan',
                'employee_code' => $att->user?->employee?->employee_code ?? 'RIM-000',
                'position' => $att->user?->employee?->position ?? 'Arsitek',
            ]);

        $counts = [
            'site_visit_pending' => $siteVisits->filter(
                fn (array $s) => $s['site_visit_status'] === 'pending' || $s['compensation_status'] === 'pending'
            )->count(),
            'leave_pending' => $leaveRequests->where('status', 'pending')->count(),
            'overtime_pending' => $overtimes->where('status', 'pending')->count(),
            'adjustment_pending' => $adjustments->where('adjustment_status', 'pending')->count(),
        ];

        return Inertia::render('Attendance/Approvals', [
            'siteVisits' => $siteVisits->values(),
            'leaveRequests' => $leaveRequests->values(),
            'overtimes' => $overtimes->values(),
            'adjustments' => $adjustments->values(),
            'counts' => $counts,
        ]);
    }

    /**
     * Approve or reject a Site Visit or Weekend Compensation (with auto-lock for Ganti Hari).
     */
    public function approveSiteVisit(Request $request, Attendance $attendance): RedirectResponse
    {
        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
        ]);

        $newStatus = $validated['action'] === 'approve' ? 'approved' : 'rejected';

        $updates = [
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ];

        if ($attendance->mode === 'site_visit' || $attendance->site_visit_status !== 'none') {
            $updates['site_visit_status'] = $newStatus;
            if ($newStatus === 'rejected') {
                $updates['status'] = 'alpha';
            }
        }

        if ($attendance->is_weekend) {
            $updates['compensation_status'] = $newStatus;

            if ($newStatus === 'approved' && $attendance->compensation_type === 'day_off_exchange' && $attendance->exchange_date) {
                $this->upsertAttendanceForDate($attendance->user_id, $attendance->exchange_date, [
                    'mode' => 'office',
                    'is_weekend' => false,
                    'compensation_type' => 'none',
                    'compensation_status' => 'approved',
                    'target_work_minutes' => 0,
                    'actual_work_minutes' => 0,
                    'shortage_minutes' => 0,
                    'status' => 'ganti_hari',
                    'approved_by' => $request->user()->id,
                    'approved_at' => now(),
                    'notes' => "Libur Pengganti (Auto-Locked) dari kerja akhir pekan {$attendance->date->format('Y-m-d')}",
                ]);
            }
        }

        $attendance->update($updates);

        $label = $newStatus === 'approved' ? 'menyetujui' : 'menolak';
        ActivityLog::record(
            action: 'attendance.approval',
            description: "Admin {$label} presensi lapangan/akhir pekan {$attendance->user?->name}",
            reference: $attendance,
            user: $request->user(),
        );

        return redirect()->back()->with('success', "Status verifikasi presensi berhasil diperbarui ({$newStatus}).");
    }

    /**
     * Approve or reject a Leave Request (and auto-populate Attendance rows on approval).
     */
    public function approveLeave(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'rejection_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $newStatus = $validated['action'] === 'approve' ? 'approved' : 'rejected';

        $leaveRequest->update([
            'status' => $newStatus,
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'rejection_reason' => $newStatus === 'rejected' ? ($validated['rejection_reason'] ?? 'Ditolak oleh Admin') : null,
        ]);

        if ($newStatus === 'approved' && $leaveRequest->type !== 'wfh') {
            $leaveUser = $leaveRequest->user?->load('employee');
            $period = CarbonPeriod::create($leaveRequest->start_date, $leaveRequest->end_date);
            foreach ($period as $date) {
                $carbonDate = Carbon::instance($date);
                if ($leaveUser ? $leaveUser->isOffDay($carbonDate) : $carbonDate->isWeekend()) {
                    continue;
                }

                $this->upsertAttendanceForDate($leaveRequest->user_id, $date, [
                    'mode' => 'office',
                    'is_weekend' => false,
                    'target_work_minutes' => 0,
                    'actual_work_minutes' => 0,
                    'shortage_minutes' => 0,
                    'status' => $leaveRequest->type,
                    'approved_by' => $request->user()->id,
                    'approved_at' => now(),
                    'notes' => "Disetujui ({$leaveRequest->type}): {$leaveRequest->reason}",
                ]);
            }
        }

        $typeLabel = $leaveRequest->type === 'wfh' ? 'Izin WFH' : $leaveRequest->type;
        $actionLabel = $newStatus === 'approved' ? 'menyetujui' : 'menolak';
        ActivityLog::record(
            action: 'leave.approval',
            description: "Super Admin {$actionLabel} permohonan {$typeLabel} {$leaveRequest->user?->name}",
            reference: $leaveRequest,
            user: $request->user(),
        );

        return redirect()->back()->with('success', "Permohonan {$typeLabel} berhasil diperbarui ({$newStatus}).");
    }

    /**
     * Approve or reject an Overtime submission.
     */
    public function approveOvertime(Request $request, Overtime $overtime): RedirectResponse
    {
        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'duration_minutes' => ['nullable', 'integer', 'min:1'],
            'rejection_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $newStatus = $validated['action'] === 'approve' ? 'approved' : 'rejected';

        $overtime->update([
            'status' => $newStatus,
            'duration_minutes' => $validated['duration_minutes'] ?? $overtime->duration_minutes ?? 60,
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'rejection_reason' => $newStatus === 'rejected' ? ($validated['rejection_reason'] ?? null) : null,
        ]);

        return redirect()->back()->with('success', "Pengajuan lembur berhasil diperbarui ({$newStatus}).");
    }

    /**
     * Approve or reject an Attendance Adjustment request.
     */
    public function approveAdjustment(Request $request, Attendance $attendance): RedirectResponse
    {
        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'rejection_reason' => ['nullable', 'string', 'max:500'],
        ]);

        if ($validated['action'] === 'approve') {
            $updates = [
                'adjustment_status' => 'approved',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ];

            $type = $attendance->adjustment_type;

            if (in_array($type, ['check_in', 'full_day'], true) && $attendance->adjusted_check_in_at) {
                $updates['check_in_at'] = $attendance->adjusted_check_in_at;
            }

            if (in_array($type, ['check_out', 'full_day'], true) && $attendance->adjusted_check_out_at) {
                $updates['check_out_at'] = $attendance->adjusted_check_out_at;
            }

            $effectiveCheckIn = $updates['check_in_at'] ?? $attendance->check_in_at;
            $effectiveCheckOut = $updates['check_out_at'] ?? $attendance->check_out_at;

            if ($effectiveCheckIn && $effectiveCheckOut) {
                $actualMinutes = max(1, (int) $effectiveCheckIn->diffInMinutes($effectiveCheckOut));
                $attUser = $attendance->user?->load('employee');
                $targetMinutes = $attendance->target_work_minutes ?: ($attUser?->dailyTargetWorkMinutes() ?? 540);
                $shortageMinutes = $attendance->is_weekend ? 0 : max(0, $targetMinutes - $actualMinutes);

                $updates['actual_work_minutes'] = $actualMinutes;
                $updates['shortage_minutes'] = $shortageMinutes;
                $updates['status'] = $shortageMinutes > 0 ? 'kurang_jam' : 'hadir';
            }

            $attendance->update($updates);

            ActivityLog::record(
                action: 'attendance.adjustment_approved',
                description: "Admin menyetujui koreksi presensi {$attendance->user?->name} tanggal {$attendance->date->format('Y-m-d')}",
                reference: $attendance,
                user: $request->user(),
            );

            return redirect()->back()->with('success', 'Pengajuan koreksi presensi berhasil disetujui.');
        }

        $attendance->update([
            'adjustment_status' => 'rejected',
            'notes' => $validated['rejection_reason']
                ? ($attendance->notes ? "{$attendance->notes} | Ditolak: {$validated['rejection_reason']}" : "Ditolak: {$validated['rejection_reason']}")
                : $attendance->notes,
        ]);

        ActivityLog::record(
            action: 'attendance.adjustment_rejected',
            description: "Admin menolak koreksi presensi {$attendance->user?->name} tanggal {$attendance->date->format('Y-m-d')}",
            reference: $attendance,
            user: $request->user(),
        );

        return redirect()->back()->with('success', 'Pengajuan koreksi presensi ditolak.');
    }

    /**
     * Display the Team Attendance Recap & Monitoring page (/attendance/monitoring).
     */
    public function monitoring(Request $request): Response
    {
        $today = Carbon::today();
        $month = $request->integer('month', $today->month);
        $year = $request->integer('year', $today->year);

        $users = User::query()
            ->with('employee')
            ->where('is_active', true)
            ->whereDoesntHave('employee', fn ($q) => $q->where('employment_status', 'freelance'))
            ->orderBy('id')
            ->get();

        $todayAttendances = Attendance::query()
            ->whereDate('date', $today)
            ->get();

        $officePresent = $todayAttendances->whereIn('mode', ['office', 'wfh'])->whereIn('status', ['hadir', 'kurang_jam'])->count();
        $siteVisitToday = $todayAttendances->where('mode', 'site_visit')->count();
        $leaveToday = $todayAttendances->whereIn('status', ['izin', 'cuti', 'sakit', 'ganti_hari'])->count();
        $notYetPresent = max(0, $users->count() - ($officePresent + $siteVisitToday + $leaveToday));

        $monthAttendances = Attendance::query()
            ->with(['user.employee', 'siteVisitProject:id,name'])
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->orderByDesc('date')
            ->get();

        $monthOvertimes = Overtime::query()
            ->where('status', 'approved')
            ->whereMonth('start_at', $month)
            ->whereYear('start_at', $year)
            ->get();

        $monthlyRecap = $users->map(function (User $u) use ($monthAttendances, $monthOvertimes): array {
            $userAtts = $monthAttendances->where('user_id', $u->id);
            $userOts = $monthOvertimes->where('user_id', $u->id);

            $presentDays = $userAtts->whereIn('status', ['hadir', 'kurang_jam', 'site_visit'])->count();
            $siteVisitDays = $userAtts->where('mode', 'site_visit')->count();
            $kurangJamDays = $userAtts->where('status', 'kurang_jam')->count();
            $shortageMinutes = (int) $userAtts->sum('shortage_minutes');
            $leaveDays = $userAtts->whereIn('status', ['izin', 'cuti', 'sakit'])->count();
            $gantiHariDays = $userAtts->where('status', 'ganti_hari')->count();
            $alphaDays = $userAtts->where('status', 'alpha')->count();
            $overtimeMinutes = (int) $userOts->sum('duration_minutes');

            return [
                'user_id' => $u->id,
                'name' => $u->name,
                'employee_code' => $u->employee?->employee_code ?? sprintf('RIM-%03d', $u->id),
                'position' => $u->employee?->position ?? 'Arsitek',
                'department' => $u->employee?->department ?? 'Perencanaan',
                'present_days' => $presentDays,
                'site_visit_days' => $siteVisitDays,
                'kurang_jam_days' => $kurangJamDays,
                'shortage_minutes' => $shortageMinutes,
                'leave_days' => $leaveDays,
                'ganti_hari_days' => $gantiHariDays,
                'alpha_days' => $alphaDays,
                'overtime_hours' => round($overtimeMinutes / 60, 1),
            ];
        });

        $recentLogs = $monthAttendances->take(25)->map(fn (Attendance $att) => [
            ...$this->formatAttendance($att),
            'user_name' => $att->user?->name ?? 'Karyawan',
            'employee_code' => $att->user?->employee?->employee_code ?? 'RIM-000',
        ]);

        $overtimeLogs = Overtime::query()
            ->with(['user.employee', 'project:id,name'])
            ->whereMonth('start_at', $month)
            ->whereYear('start_at', $year)
            ->orderByDesc('start_at')
            ->get()
            ->map(fn (Overtime $ot) => [
                'id' => $ot->id,
                'user_id' => $ot->user_id,
                'user_name' => $ot->user?->name ?? 'Karyawan',
                'employee_code' => $ot->user?->employee?->employee_code ?? 'RIM-000',
                'project_id' => $ot->project_id,
                'project_name' => $ot->project?->name ?? 'Proyek Studio',
                'source' => $ot->source,
                'date' => $ot->start_at->format('Y-m-d'),
                'start_time' => $ot->start_at->format('H:i'),
                'end_time' => $ot->end_at?->format('H:i') ?? '21:00',
                'duration_minutes' => $ot->duration_minutes ?? 60,
                'task_description' => $ot->task_description ?? '',
                'status' => $ot->status,
            ]);

        $projects = Project::query()
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get();

        return Inertia::render('Attendance/Monitoring', [
            'todayTracker' => [
                'office_present' => $officePresent,
                'site_visit' => $siteVisitToday,
                'leave_or_exchange' => $leaveToday,
                'not_yet_present' => $notYetPresent,
                'total_team' => $users->count(),
            ],
            'monthlyRecap' => $monthlyRecap->values(),
            'recentLogs' => $recentLogs->values(),
            'overtimeLogs' => $overtimeLogs->values(),
            'projects' => $projects,
            'employees' => $users->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'employee_code' => $u->employee?->employee_code ?? sprintf('RIM-%03d', $u->id),
            ])->values(),
            'filters' => [
                'month' => $month,
                'year' => $year,
            ],
        ]);
    }

    /**
     * Manual attendance or overtime adjustment / correction by Admin with audit trail.
     */
    public function manualAdjust(Request $request): RedirectResponse
    {
        $adjustType = $request->input('adjust_type', 'attendance');

        if ($adjustType === 'overtime') {
            $validated = $request->validate([
                'overtime_id' => ['nullable', 'exists:overtimes,id'],
                'user_id' => ['required', 'exists:users,id'],
                'date' => ['required', 'date'],
                'project_id' => ['nullable', 'exists:projects,id'],
                'start_time' => ['nullable', 'date_format:H:i'],
                'duration_minutes' => ['required', 'integer', 'min:15', 'max:960'],
                'status' => ['required', Rule::in(['approved', 'pending', 'rejected'])],
                'task_description' => ['required', 'string', 'max:500'],
            ]);

            $dateStr = Carbon::parse($validated['date'])->format('Y-m-d');
            $startTime = $validated['start_time'] ?: '19:00';
            $startAt = Carbon::parse("{$dateStr} {$startTime}");
            $endAt = $startAt->copy()->addMinutes((int) $validated['duration_minutes']);

            $attendance = Attendance::query()
                ->where('user_id', $validated['user_id'])
                ->whereDate('date', $dateStr)
                ->first();

            $payload = [
                'attendance_id' => $attendance?->id,
                'user_id' => $validated['user_id'],
                'project_id' => $validated['project_id'] ?? null,
                'source' => 'manual',
                'start_at' => $startAt,
                'end_at' => $endAt,
                'duration_minutes' => (int) $validated['duration_minutes'],
                'task_description' => "[Koreksi Admin] {$validated['task_description']}",
                'status' => $validated['status'],
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ];

            if (! empty($validated['overtime_id'])) {
                $overtime = Overtime::query()->findOrFail($validated['overtime_id']);
                $overtime->update($payload);
            } else {
                $overtime = Overtime::query()->create($payload);
            }

            $targetUser = User::query()->find($validated['user_id']);
            ActivityLog::record(
                action: 'overtime.manual_adjustment',
                description: "Koreksi/input lembur manual untuk {$targetUser?->name} tanggal {$dateStr} ({$validated['duration_minutes']} menit)",
                reference: $overtime,
                user: $request->user(),
            );

            return redirect()->back()->with(
                'success',
                "Data lembur {$targetUser?->name} ({$validated['duration_minutes']} menit) pada {$dateStr} berhasil disimpan.",
            );
        }

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'date' => ['required', 'date'],
            'mode' => ['required', Rule::in(['office', 'site_visit', 'wfh'])],
            'status' => ['required', Rule::in(['hadir', 'kurang_jam', 'izin', 'sakit', 'cuti', 'alpha', 'site_visit', 'ganti_hari'])],
            'check_in_time' => ['nullable', 'date_format:H:i'],
            'check_out_time' => ['nullable', 'date_format:H:i'],
            'notes' => ['required', 'string', 'max:500'],
            'overtime_minutes' => ['nullable', 'integer', 'min:0', 'max:960'],
            'overtime_project_id' => ['nullable', 'exists:projects,id'],
        ]);

        $dateStr = Carbon::parse($validated['date'])->format('Y-m-d');
        $checkInAt = ! empty($validated['check_in_time'])
            ? Carbon::parse("{$dateStr} {$validated['check_in_time']}")
            : null;
        $checkOutAt = ! empty($validated['check_out_time'])
            ? Carbon::parse("{$dateStr} {$validated['check_out_time']}")
            : null;

        $targetUser = User::query()->with('employee')->find((int) $validated['user_id']);
        $defaultTargetMinutes = $targetUser?->dailyTargetWorkMinutes() ?? 540;

        $actualMinutes = ($checkInAt && $checkOutAt)
            ? max(0, (int) $checkInAt->diffInMinutes($checkOutAt))
            : (in_array($validated['status'], ['hadir', 'site_visit'], true) ? $defaultTargetMinutes : 0);

        $targetMinutes = in_array($validated['status'], ['izin', 'sakit', 'cuti', 'ganti_hari'], true) ? 0 : $defaultTargetMinutes;
        $shortageMinutes = $validated['status'] === 'kurang_jam'
            ? max(0, $targetMinutes - $actualMinutes)
            : 0;

        $attendance = $this->upsertAttendanceForDate((int) $validated['user_id'], $dateStr, [
            'mode' => $validated['mode'],
            'check_in_at' => $checkInAt,
            'check_out_at' => $checkOutAt,
            'target_work_minutes' => $targetMinutes,
            'actual_work_minutes' => $actualMinutes,
            'shortage_minutes' => $shortageMinutes,
            'status' => $validated['status'],
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'notes' => "[Koreksi Admin] {$validated['notes']}",
        ]);

        if (! empty($validated['overtime_minutes']) && (int) $validated['overtime_minutes'] > 0) {
            $otStart = ($checkOutAt ?? Carbon::parse("{$dateStr} 18:00"))->copy()->addHour();
            Overtime::query()->create([
                'attendance_id' => $attendance->id,
                'user_id' => $validated['user_id'],
                'project_id' => $validated['overtime_project_id'] ?? null,
                'source' => 'manual',
                'start_at' => $otStart,
                'end_at' => $otStart->copy()->addMinutes((int) $validated['overtime_minutes']),
                'duration_minutes' => (int) $validated['overtime_minutes'],
                'task_description' => "[Koreksi Admin] {$validated['notes']}",
                'status' => 'approved',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ]);
        }

        $targetUser = User::query()->find($validated['user_id']);
        ActivityLog::record(
            action: 'attendance.manual_adjustment',
            description: "Koreksi absensi manual untuk {$targetUser?->name} tanggal {$dateStr} ({$validated['status']})",
            reference: $attendance,
            user: $request->user(),
        );

        return redirect()->back()->with('success', "Koreksi absensi {$targetUser?->name} pada {$dateStr} berhasil disimpan.");
    }

    /**
     * Export monthly attendance recap as CSV.
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $today = Carbon::today();
        $month = $request->integer('month', $today->month);
        $year = $request->integer('year', $today->year);

        $users = User::query()->with('employee')->orderBy('id')->get();
        $monthAttendances = Attendance::query()
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->get();
        $monthOvertimes = Overtime::query()
            ->where('status', 'approved')
            ->whereMonth('start_at', $month)
            ->whereYear('start_at', $year)
            ->get();

        $filename = sprintf('rekap-presensi-rim-%04d-%02d.csv', $year, $month);

        return response()->streamDownload(function () use ($users, $monthAttendances, $monthOvertimes): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            fputcsv($handle, [
                'NIK',
                'Nama Karyawan',
                'Jabatan',
                'Divisi',
                'Hari Hadir',
                'Site Visit',
                'Kurang Jam (Hari)',
                'Total Kurang Menit',
                'Izin/Cuti/Sakit',
                'Ganti Hari',
                'Alpha',
                'Jam Lembur Disetujui',
            ]);

            foreach ($users as $u) {
                $userAtts = $monthAttendances->where('user_id', $u->id);
                $userOts = $monthOvertimes->where('user_id', $u->id);

                fputcsv($handle, [
                    $u->employee?->employee_code ?? sprintf('RIM-%03d', $u->id),
                    $u->name,
                    $u->employee?->position ?? 'Arsitek',
                    $u->employee?->department ?? 'Perencanaan',
                    $userAtts->whereIn('status', ['hadir', 'kurang_jam', 'site_visit'])->count(),
                    $userAtts->where('mode', 'site_visit')->count(),
                    $userAtts->where('status', 'kurang_jam')->count(),
                    (int) $userAtts->sum('shortage_minutes'),
                    $userAtts->whereIn('status', ['izin', 'cuti', 'sakit'])->count(),
                    $userAtts->where('status', 'ganti_hari')->count(),
                    $userAtts->where('status', 'alpha')->count(),
                    round(((int) $userOts->sum('duration_minutes')) / 60, 1),
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Validate whether a user is allowed to start an overtime session today (max 1x/day & not on leave).
     */
    private function validateCanStartOvertime(User $user, Carbon $today, ?Attendance $todayAttendance): ?string
    {
        if ($todayAttendance && in_array($todayAttendance->status, ['ganti_hari', 'izin', 'cuti', 'sakit'], true)) {
            return "Tidak dapat memulai lembur karena status presensi hari ini adalah {$todayAttendance->status}.";
        }

        $hasLeaveToday = LeaveRequest::query()
            ->where('user_id', $user->id)
            ->whereIn('type', ['izin', 'cuti', 'sakit'])
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->where('status', 'approved')
            ->exists();

        if ($hasLeaveToday) {
            return 'Tidak dapat memulai lembur karena Anda memiliki pengajuan Izin / Cuti / Sakit untuk hari ini.';
        }

        $alreadyHasOvertimeToday = Overtime::query()
            ->where('user_id', $user->id)
            ->whereDate('start_at', $today)
            ->whereIn('status', ['active', 'pending', 'approved'])
            ->exists();

        if ($alreadyHasOvertimeToday) {
            return 'Anda sudah mencatat sesi lembur hari ini. Lembur hanya diperbolehkan 1 kali per hari.';
        }

        return null;
    }

    /**
     * Safely create or update an Attendance record for a specific user and date.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function upsertAttendanceForDate(int $userId, Carbon|string $date, array $attributes): Attendance
    {
        $carbonDate = Carbon::parse($date)->startOfDay();

        $existing = Attendance::query()
            ->where('user_id', $userId)
            ->whereDate('date', $carbonDate)
            ->first();

        if ($existing) {
            $existing->update($attributes);

            return $existing->fresh();
        }

        return Attendance::query()->create([
            'user_id' => $userId,
            'date' => $carbonDate,
            ...$attributes,
        ]);
    }

    /**
     * Format an Attendance model into a clean frontend array.
     *
     * @return array<string, mixed>
     */
    private function formatAttendance(Attendance $att): array
    {
        $cooldownMinutes = OfficeSetting::current()->overtime_cooldown_minutes ?? 60;
        $elapsedSeconds = 0;
        $cooldownRemainingSeconds = $cooldownMinutes * 60;
        if ($att->check_in_at) {
            if ($att->check_out_at) {
                $elapsedSeconds = $att->actual_work_minutes !== null
                    ? $att->actual_work_minutes * 60
                    : max(0, (int) $att->check_in_at->diffInSeconds($att->check_out_at));

                $secondsSinceCheckout = max(0, (int) $att->check_out_at->diffInSeconds(now()));
                $cooldownRemainingSeconds = max(0, ($cooldownMinutes * 60) - $secondsSinceCheckout);
            } else {
                $elapsedSeconds = max(0, (int) $att->check_in_at->diffInSeconds(now()));
            }
        }

        return [
            'id' => $att->id,
            'user_id' => $att->user_id,
            'date' => $att->date->format('Y-m-d'),
            'mode' => $att->mode,
            'is_weekend' => $att->is_weekend,
            'compensation_type' => $att->compensation_type,
            'exchange_date' => $att->exchange_date?->format('Y-m-d'),
            'compensation_status' => $att->compensation_status,
            'check_in_at' => $att->check_in_at?->toIso8601String(),
            'check_out_at' => $att->check_out_at?->toIso8601String(),
            'check_in_time' => $att->check_in_at?->format('H:i'),
            'check_out_time' => $att->check_out_at?->format('H:i'),
            'check_in_distance_meters' => $att->check_in_distance_meters,
            'target_work_minutes' => $att->target_work_minutes,
            'actual_work_minutes' => $att->actual_work_minutes,
            'elapsed_seconds' => $elapsedSeconds,
            'cooldown_remaining_seconds' => $cooldownRemainingSeconds,
            'shortage_minutes' => $att->shortage_minutes,
            'status' => $att->status,
            'is_auto_closed' => (bool) $att->is_auto_closed,
            'adjustment_type' => $att->adjustment_type ?? 'none',
            'adjustment_status' => $att->adjustment_status ?? 'none',
            'adjusted_check_in_at' => $att->adjusted_check_in_at?->toIso8601String(),
            'adjusted_check_out_at' => $att->adjusted_check_out_at?->toIso8601String(),
            'adjusted_check_in_time' => $att->adjusted_check_in_at?->format('H:i'),
            'adjusted_check_out_time' => $att->adjusted_check_out_at?->format('H:i'),
            'adjustment_reason' => $att->adjustment_reason,
            'site_visit_project_id' => $att->site_visit_project_id,
            'site_visit_project_name' => $att->siteVisitProject?->name,
            'site_visit_photo_url' => $att->site_visit_photo_url,
            'site_visit_status' => $att->site_visit_status,
            'notes' => $att->notes,
        ];
    }

    /**
     * Seed realistic sample attendance, site visit, leave, and overtime data when empty.
     */
    private function seedSampleAttendanceIfEmpty(): void
    {
        if (Attendance::query()->exists()) {
            return;
        }

        $employees = User::query()->where('role', UserRole::Employee)->get();
        if ($employees->isEmpty()) {
            return;
        }

        $project = Project::query()->first();
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        foreach ($employees->values() as $idx => $emp) {
            if ($idx === 0) {
                $att = Attendance::query()->create([
                    'user_id' => $emp->id,
                    'date' => $today->format('Y-m-d'),
                    'mode' => 'office',
                    'check_in_at' => $today->copy()->setTime(8, 5),
                    'check_in_distance_meters' => 28,
                    'target_work_minutes' => 540,
                    'status' => 'hadir',
                    'notes' => 'Hadir tepat waktu di studio',
                ]);

                Overtime::query()->create([
                    'attendance_id' => $att->id,
                    'user_id' => $emp->id,
                    'project_id' => $project?->id,
                    'source' => 'regular',
                    'start_at' => $yesterday->copy()->setTime(19, 0),
                    'end_at' => $yesterday->copy()->setTime(21, 30),
                    'duration_minutes' => 150,
                    'task_description' => 'Finalisasi gambar kerja denah lantai 2 & potongan',
                    'status' => 'pending',
                ]);
            } elseif ($idx === 1) {
                Attendance::query()->create([
                    'user_id' => $emp->id,
                    'date' => $today->format('Y-m-d'),
                    'mode' => 'site_visit',
                    'check_in_at' => $today->copy()->setTime(8, 45),
                    'target_work_minutes' => 540,
                    'status' => 'site_visit',
                    'site_visit_project_id' => $project?->id,
                    'site_visit_photo_url' => '/project-covers/interior-kafe.png',
                    'site_visit_status' => 'pending',
                    'notes' => 'Inspeksi progres pemasangan plafon & elektrikal lapangan',
                ]);
            } elseif ($idx === 2) {
                Attendance::query()->create([
                    'user_id' => $emp->id,
                    'date' => $yesterday->format('Y-m-d'),
                    'mode' => 'office',
                    'check_in_at' => $yesterday->copy()->setTime(8, 30),
                    'check_out_at' => $yesterday->copy()->setTime(16, 30),
                    'check_in_distance_meters' => 42,
                    'target_work_minutes' => 540,
                    'actual_work_minutes' => 480,
                    'shortage_minutes' => 60,
                    'status' => 'kurang_jam',
                    'notes' => 'Pulang lebih awal 1 jam',
                ]);

                LeaveRequest::query()->create([
                    'user_id' => $emp->id,
                    'type' => 'cuti',
                    'start_date' => $today->copy()->addDays(2)->format('Y-m-d'),
                    'end_date' => $today->copy()->addDays(3)->format('Y-m-d'),
                    'total_days' => 2,
                    'reason' => 'Acara keluarga di luar kota',
                    'status' => 'pending',
                ]);
            }
        }
    }

    /**
     * Calculate Haversine distance in meters between two GPS coordinates.
     */
    private function calculateHaversineMeters(float $lat1, float $lon1, float $lat2, float $lon2): int
    {
        $earthRadius = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return (int) round($earthRadius * $c);
    }
}
