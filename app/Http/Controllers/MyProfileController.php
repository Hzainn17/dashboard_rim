<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\Overtime;
use App\Models\PayrollItem;
use App\Models\Project;
use App\Models\ProjectTask;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class MyProfileController extends Controller
{
    /**
     * Display the employee's Personal Profile, KPI summary, and private Payslips (/my-profile).
     */
    public function index(Request $request): Response
    {
        $user = $request->user()->load('employee');
        $emp = $user->employee;
        $now = Carbon::now();

        $joinDate = $emp?->join_date ? Carbon::parse($emp->join_date) : $user->created_at;
        $totalMonths = $joinDate ? max(0, (int) $joinDate->diffInMonths($now)) : 0;
        $years = intdiv($totalMonths, 12);
        $months = $totalMonths % 12;

        if ($years > 0 && $months > 0) {
            $tenureText = "{$years} Tahun {$months} Bulan";
        } elseif ($years > 0) {
            $tenureText = "{$years} Tahun";
        } elseif ($months > 0) {
            $tenureText = "{$months} Bulan";
        } else {
            $tenureText = '< 1 Bulan';
        }

        // Real-time KPI Metrics
        $presentDaysMonth = Attendance::query()
            ->where('user_id', $user->id)
            ->whereMonth('date', $now->month)
            ->whereYear('date', $now->year)
            ->whereIn('status', ['hadir', 'kurang_jam', 'site_visit', 'ganti_hari'])
            ->count();

        $activeProjectsCount = Project::query()
            ->whereIn('status', ['planning', 'ongoing', 'review'])
            ->where(function ($q) use ($user): void {
                $q->where('owner_id', $user->id)
                    ->orWhereHas('members', fn ($mq) => $mq->where('users.id', $user->id));
            })
            ->count();

        $totalTasks = ProjectTask::query()->where('assignee_id', $user->id)->count();
        $doneTasks = ProjectTask::query()
            ->where('assignee_id', $user->id)
            ->where('status', 'done')
            ->count();
        $taskCompletionRate = $totalTasks > 0 ? (int) round(($doneTasks / $totalTasks) * 100) : 0;

        $approvedOvertimeMinutes = (int) Overtime::query()
            ->where('user_id', $user->id)
            ->where('status', 'approved')
            ->whereMonth('start_at', $now->month)
            ->whereYear('start_at', $now->year)
            ->sum('duration_minutes');

        // Private Payslips (only finalized or paid)
        $slips = PayrollItem::query()
            ->with('payroll')
            ->where('user_id', $user->id)
            ->whereHas('payroll', fn ($q) => $q->whereIn('status', ['finalized', 'paid']))
            ->orderByDesc('id')
            ->get()
            ->map(fn (PayrollItem $item) => [
                'id' => $item->id,
                'period_name' => $item->payroll->period_name,
                'type' => $item->payroll->type ?? 'regular',
                'start_date_formatted' => $item->payroll->start_date->translatedFormat('d M Y'),
                'end_date_formatted' => $item->payroll->end_date->translatedFormat('d M Y'),
                'status' => $item->payroll->status,
                'paid_at' => $item->payroll->paid_at?->translatedFormat('d M Y'),
                'base_salary' => (float) $item->base_salary,
                'fixed_allowance' => (float) $item->fixed_allowance,
                'overtime_hours' => (float) $item->overtime_hours,
                'overtime_amount' => (float) $item->overtime_amount,
                'bonus_amount' => (float) $item->bonus_amount,
                'thr_amount' => (float) $item->thr_amount,
                'alpha_deduction' => (float) $item->alpha_deduction,
                'other_deduction' => (float) $item->other_deduction,
                'total_allowance' => (float) $item->total_allowance,
                'total_deduction' => (float) $item->total_deduction,
                'net_salary' => (float) $item->net_salary,
                'present_days' => $item->present_days,
                'absent_days' => $item->absent_days,
                'bank_name' => $item->bank_name ?: 'BCA',
                'bank_account_number' => $item->bank_account_number ?: '-',
                'bank_account_holder' => $item->bank_account_holder ?: $user->name,
            ])
            ->values();

        return Inertia::render('Profile/MyProfile', [
            'profile' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'photo_url' => $user->photo_url,
                'employee_code' => $emp?->employee_code ?? sprintf('RIM-%03d', $user->id),
                'position' => $emp?->position ?? 'Arsitek',
                'department' => $emp?->department ?? 'Perencanaan',
                'employment_status' => $emp?->employment_status ?? 'tetap',
                'join_date_formatted' => $joinDate?->translatedFormat('d M Y') ?? '-',
                'tenure_text' => $tenureText,
                'annual_leave_quota' => $emp?->annual_leave_quota ?? 12,
                'bank_name' => $emp?->bank_name ?? 'BCA',
                'bank_account_number' => $emp?->bank_account_number ?? '-',
                'bank_account_holder' => $emp?->bank_account_holder ?? $user->name,
                'bank_branch' => $emp?->bank_branch ?? '-',
            ],
            'kpi' => [
                'present_days_month' => $presentDaysMonth,
                'active_projects_count' => $activeProjectsCount,
                'total_tasks' => $totalTasks,
                'done_tasks' => $doneTasks,
                'task_completion_rate' => $taskCompletionRate,
                'overtime_hours_month' => round($approvedOvertimeMinutes / 60, 1),
            ],
            'slips' => $slips,
        ]);
    }

    /**
     * Upload or update the employee's profile photo (/my-profile/photo).
     */
    public function updatePhoto(Request $request): RedirectResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:2048'],
        ]);

        $user = $request->user();
        $dir = public_path('uploads/avatars');
        if (! File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true);
        }

        if ($user->photo_url && str_starts_with($user->photo_url, '/uploads/avatars/')) {
            $oldPath = public_path(ltrim($user->photo_url, '/'));
            if (File::exists($oldPath)) {
                File::delete($oldPath);
            }
        }

        $file = $request->file('photo');
        $filename = 'avatar_'.$user->id.'_'.time().'.'.($file->guessExtension() ?: 'jpg');
        $file->move($dir, $filename);

        $user->update(['photo_url' => "/uploads/avatars/{$filename}"]);

        ActivityLog::record(
            action: 'profile.photo_updated',
            description: "{$user->name} memperbarui foto profil",
            reference: $user,
            user: $user,
        );

        return redirect()->back()->with('success', 'Foto profil berhasil diperbarui.');
    }

    /**
     * Reset profile photo back to default initials avatar (/my-profile/photo).
     */
    public function deletePhoto(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->photo_url && str_starts_with($user->photo_url, '/uploads/avatars/')) {
            $oldPath = public_path(ltrim($user->photo_url, '/'));
            if (File::exists($oldPath)) {
                File::delete($oldPath);
            }
        }

        $user->update(['photo_url' => null]);

        return redirect()->back()->with('success', 'Foto profil dikembalikan ke avatar default.');
    }

    /**
     * Update the authenticated user's contact phone number (/my-profile/contact).
     */
    public function updateContact(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $user = $request->user();
        $user->update([
            'phone' => $validated['phone'] ?: null,
        ]);

        ActivityLog::record(
            action: 'profile.contact_updated',
            description: "{$user->name} memperbarui nomor kontak",
            reference: $user,
            user: $user,
        );

        return redirect()->back()->with('success', 'Nomor kontak berhasil diperbarui.');
    }

    /**
     * Update the authenticated user's password (/my-profile/password).
     */
    public function updatePassword(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = $request->user();
        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        ActivityLog::record(
            action: 'profile.password_updated',
            description: "{$user->name} mengganti kata sandi akun",
            reference: $user,
            user: $user,
        );

        return redirect()->back()->with('success', 'Kata sandi akun berhasil diperbarui.');
    }
}
