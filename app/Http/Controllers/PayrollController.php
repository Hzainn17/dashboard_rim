<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\OfficeSetting;
use App\Models\Overtime;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PayrollController extends Controller
{
    /**
     * Display the Admin Payroll management page (/payroll).
     */
    public function index(Request $request): Response
    {
        $payrolls = Payroll::query()
            ->with('generator:id,name')
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->orderByDesc('id')
            ->get();

        $selectedId = $request->integer('payroll_id');
        $selectedPayroll = $selectedId
            ? $payrolls->firstWhere('id', $selectedId)
            : $payrolls->first();

        $items = collect();
        if ($selectedPayroll) {
            $selectedPayroll->load([
                'items.user.employee',
                'items.components',
            ]);
            $items = $selectedPayroll->items->map(fn (PayrollItem $item) => [
                'id' => $item->id,
                'user_id' => $item->user_id,
                'employee_name' => $item->user?->name ?? 'Karyawan',
                'employee_code' => $item->user?->employee?->employee_code ?? sprintf('RIM-%03d', $item->user_id),
                'position' => $item->user?->employee?->position ?? 'Arsitek',
                'photo_url' => $item->user?->photo_url,
                'base_salary' => (float) $item->base_salary,
                'fixed_allowance' => (float) $item->fixed_allowance,
                'overtime_hours' => (float) $item->overtime_hours,
                'overtime_amount' => (float) $item->overtime_amount,
                'bonus_amount' => (float) $item->bonus_amount,
                'thr_amount' => (float) $item->thr_amount,
                'shortage_deduction' => (float) $item->shortage_deduction,
                'alpha_deduction' => (float) $item->alpha_deduction,
                'other_deduction' => (float) $item->other_deduction,
                'total_allowance' => (float) $item->total_allowance,
                'total_deduction' => (float) $item->total_deduction,
                'net_salary' => (float) $item->net_salary,
                'present_days' => $item->present_days,
                'absent_days' => $item->absent_days,
                'shortage_minutes' => $item->shortage_minutes,
                'is_manual_override' => (bool) $item->is_manual_override,
                'bank_name' => $item->bank_name ?: ($item->user?->employee?->bank_name ?? 'BCA'),
                'bank_account_number' => $item->bank_account_number ?: ($item->user?->employee?->bank_account_number ?? '-'),
                'bank_account_holder' => $item->bank_account_holder ?: ($item->user?->employee?->bank_account_holder ?? $item->user?->name),
            ])->values();
        }

        $now = Carbon::now();
        $defaultStart = $now->copy()->startOfMonth()->format('Y-m-d');
        $defaultEnd = $now->copy()->endOfMonth()->format('Y-m-d');
        $defaultName = 'Payroll '.$now->translatedFormat('F Y');

        $activeEmployees = User::query()
            ->with('employee')
            ->where('is_active', true)
            ->whereHas('employee', fn ($q) => $q->where('employment_status', '!=', 'freelance'))
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'employee_code' => $u->employee?->employee_code ?? sprintf('RIM-%03d', $u->id),
                'position' => $u->employee?->position ?? 'Arsitek',
                'join_date' => $u->employee?->join_date?->format('Y-m-d'),
                'base_salary' => (float) ($u->employee?->base_salary ?? 0),
                'fixed_allowance' => (float) ($u->employee?->fixed_allowance ?? 0),
                'bank_name' => $u->employee?->bank_name ?? 'BCA',
            ])
            ->values();

        return Inertia::render('Payroll/Index', [
            'payrolls' => $payrolls->map(fn (Payroll $p) => [
                'id' => $p->id,
                'period_name' => $p->period_name,
                'type' => $p->type ?? 'regular',
                'start_date' => $p->start_date->format('Y-m-d'),
                'end_date' => $p->end_date->format('Y-m-d'),
                'thr_reference_date' => $p->thr_reference_date?->format('Y-m-d'),
                'period_month' => $p->period_month,
                'period_year' => $p->period_year,
                'status' => $p->status,
                'total_amount' => (float) $p->total_amount,
                'finalized_at' => $p->finalized_at?->translatedFormat('d M Y, H:i'),
                'paid_at' => $p->paid_at?->translatedFormat('d M Y, H:i'),
                'generator_name' => $p->generator?->name ?? 'Admin',
            ])->values(),
            'selectedPayroll' => $selectedPayroll ? [
                'id' => $selectedPayroll->id,
                'period_name' => $selectedPayroll->period_name,
                'type' => $selectedPayroll->type ?? 'regular',
                'start_date' => $selectedPayroll->start_date->format('Y-m-d'),
                'end_date' => $selectedPayroll->end_date->format('Y-m-d'),
                'thr_reference_date' => $selectedPayroll->thr_reference_date?->format('Y-m-d'),
                'thr_reference_date_formatted' => $selectedPayroll->thr_reference_date?->translatedFormat('d M Y'),
                'start_date_formatted' => $selectedPayroll->start_date->translatedFormat('d M Y'),
                'end_date_formatted' => $selectedPayroll->end_date->translatedFormat('d M Y'),
                'period_month' => $selectedPayroll->period_month,
                'period_year' => $selectedPayroll->period_year,
                'status' => $selectedPayroll->status,
                'total_amount' => (float) $selectedPayroll->total_amount,
                'items_count' => $items->count(),
                'total_overtime_amount' => $items->sum('overtime_amount'),
                'total_bonus_thr' => $items->sum('bonus_amount') + $items->sum('thr_amount'),
                'total_deduction' => $items->sum('total_deduction'),
            ] : null,
            'items' => $items,
            'employees' => $activeEmployees,
            'defaults' => [
                'period_name' => $defaultName,
                'period_month' => $now->month,
                'period_year' => $now->year,
                'start_date' => $defaultStart,
                'end_date' => $defaultEnd,
            ],
        ]);
    }

    /**
     * Generate or recalculate a draft payroll period from attendance & overtime data (/payroll/generate).
     */
    public function generate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'period_name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', Rule::in(['regular', 'thr'])],
            'period_month' => ['required', 'integer', 'between:1,12'],
            'period_year' => ['required', 'integer', 'between:2020,2100'],
            'start_date' => ['required_unless:type,thr', 'nullable', 'date'],
            'end_date' => ['required_unless:type,thr', 'nullable', 'date', 'after_or_equal:start_date'],
            'thr_reference_date' => ['required_if:type,thr', 'nullable', 'date'],
            'employee_ids' => ['nullable', 'array'],
            'employee_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $type = $validated['type'] ?? 'regular';
        $isThr = $type === 'thr';
        $thrRefDate = $isThr
            ? Carbon::parse($validated['thr_reference_date'] ?? $validated['end_date'] ?? now())
            : null;
        $startDate = $isThr
            ? $thrRefDate->copy()->startOfMonth()->format('Y-m-d')
            : $validated['start_date'];
        $endDate = $isThr
            ? $thrRefDate->copy()->endOfMonth()->format('Y-m-d')
            : $validated['end_date'];

        $existing = Payroll::query()
            ->where('type', $type)
            ->where('period_month', $validated['period_month'])
            ->where('period_year', $validated['period_year'])
            ->first();

        if ($existing && ! $existing->isDraft()) {
            return redirect()->back()->with(
                'error',
                "Payroll untuk periode {$existing->period_name} sudah berstatus '{$existing->status}' dan tidak dapat di-generate ulang.",
            );
        }

        $payroll = $existing ?? Payroll::query()->create([
            'period_name' => $validated['period_name'],
            'type' => $type,
            'period_month' => $validated['period_month'],
            'period_year' => $validated['period_year'],
            'start_date' => $startDate,
            'end_date' => $endDate,
            'thr_reference_date' => $thrRefDate?->format('Y-m-d'),
            'status' => 'draft',
            'total_amount' => 0,
            'generated_by' => $request->user()->id,
        ]);

        if ($existing) {
            $payroll->update([
                'period_name' => $validated['period_name'],
                'start_date' => $startDate,
                'end_date' => $endDate,
                'thr_reference_date' => $thrRefDate?->format('Y-m-d'),
            ]);
        }

        $officeSetting = OfficeSetting::current();
        $standardWorkMinutes = max(60, ($officeSetting->standard_work_hours ?: 9) * 60);
        $defaultOvertimeRate = (float) ($officeSetting->overtime_rate_per_hour ?: 25000);

        $employeesQuery = User::query()
            ->with('employee')
            ->where('is_active', true)
            ->whereHas('employee', fn ($q) => $q->where('employment_status', '!=', 'freelance'))
            ->orderBy('name');

        if (! empty($validated['employee_ids'])) {
            $selectedIds = array_map('intval', $validated['employee_ids']);
            $employeesQuery->whereIn('id', $selectedIds);

            PayrollItem::query()
                ->where('payroll_id', $payroll->id)
                ->whereNotIn('user_id', $selectedIds)
                ->delete();
        }

        $employees = $employeesQuery->get();

        $totalPayrollAmount = 0;

        foreach ($employees as $empUser) {
            $emp = $empUser->employee;
            $empBaseSalary = (float) $emp->base_salary;
            $empFixedAllowance = (float) $emp->fixed_allowance;
            $overtimeRate = (float) ($emp->overtime_rate_per_hour ?: $defaultOvertimeRate);

            $existingItem = PayrollItem::query()
                ->where('payroll_id', $payroll->id)
                ->where('user_id', $empUser->id)
                ->first();

            if ($isThr) {
                // Permenaker No. 6 Tahun 2016:
                // >= 12 bulan = 1x (Gaji Pokok + Tunjangan Tetap)
                // 1 - <12 bulan = (masa_kerja_bulan / 12) * (Gaji Pokok + Tunjangan Tetap)
                // < 1 bulan = 0
                $joinDate = $emp->join_date ? Carbon::parse($emp->join_date) : $thrRefDate->copy()->subYear();
                $serviceMonths = $joinDate->gt($thrRefDate) ? 0 : (int) $joinDate->diffInMonths($thrRefDate);
                $monthlyWage = $empBaseSalary + $empFixedAllowance;

                if ($serviceMonths >= 12) {
                    $thrAmount = $monthlyWage;
                } elseif ($serviceMonths >= 1) {
                    $thrAmount = round(($serviceMonths / 12) * $monthlyWage, 0);
                } else {
                    $thrAmount = 0;
                }

                $baseSalary = 0;
                $fixedAllowance = 0;
                $overtimeHours = 0;
                $overtimeAmount = 0;
                $presentDays = 0;
                $absentDays = 0;
                $shortageMinutes = 0;
                $shortageDeduction = 0;
                $alphaDeduction = 0;
                $bonusAmount = $existingItem ? (float) $existingItem->bonus_amount : 0;
                $otherDeduction = $existingItem ? (float) $existingItem->other_deduction : 0;

                if ($existingItem && $existingItem->is_manual_override) {
                    $thrAmount = (float) $existingItem->thr_amount;
                }

                $totalAllowance = $thrAmount + $bonusAmount;
                $totalDeduction = $otherDeduction;
                $netSalary = max(0, $totalAllowance - $totalDeduction);
            } else {
                $baseSalary = $empBaseSalary;
                $fixedAllowance = $empFixedAllowance;

                // Aggregate attendances within cut-off date range
                $attendances = Attendance::query()
                    ->where('user_id', $empUser->id)
                    ->whereBetween('date', [$startDate, $endDate])
                    ->get();

                $presentDays = $attendances
                    ->whereIn('status', ['hadir', 'kurang_jam', 'site_visit', 'ganti_hari'])
                    ->count();
                $absentDays = $attendances->where('status', 'alpha')->count();
                $shortageMinutes = (int) $attendances->sum('shortage_minutes');

                // Aggregate approved overtimes within cut-off date range
                $approvedOvertimeMinutes = (int) Overtime::query()
                    ->where('user_id', $empUser->id)
                    ->where('status', 'approved')
                    ->whereDate('start_at', '>=', $startDate)
                    ->whereDate('start_at', '<=', $endDate)
                    ->sum('duration_minutes');

                $overtimeHours = round($approvedOvertimeMinutes / 60, 2);
                $overtimeAmount = round($overtimeHours * $overtimeRate, 0);

                // Deductions calculation (no deduction for work hour shortage)
                $dailyRate = $baseSalary / 22;
                $shortageDeduction = 0;
                $alphaDeduction = round($absentDays * $dailyRate, 0);

                $bonusAmount = $existingItem ? (float) $existingItem->bonus_amount : 0;
                $thrAmount = 0;
                $otherDeduction = $existingItem ? (float) $existingItem->other_deduction : 0;

                if ($existingItem && $existingItem->is_manual_override) {
                    $baseSalary = (float) $existingItem->base_salary;
                    $fixedAllowance = (float) $existingItem->fixed_allowance;
                    $overtimeAmount = (float) $existingItem->overtime_amount;
                    $shortageDeduction = (float) $existingItem->shortage_deduction;
                    $alphaDeduction = (float) $existingItem->alpha_deduction;
                }

                $totalAllowance = $fixedAllowance + $overtimeAmount + $bonusAmount;
                $totalDeduction = $shortageDeduction + $alphaDeduction + $otherDeduction;
                $netSalary = max(0, $baseSalary + $totalAllowance - $totalDeduction);
            }

            PayrollItem::query()->updateOrCreate(
                [
                    'payroll_id' => $payroll->id,
                    'user_id' => $empUser->id,
                ],
                [
                    'base_salary' => $baseSalary,
                    'fixed_allowance' => $fixedAllowance,
                    'overtime_hours' => $overtimeHours,
                    'overtime_amount' => $overtimeAmount,
                    'bonus_amount' => $bonusAmount,
                    'thr_amount' => $thrAmount,
                    'shortage_deduction' => $shortageDeduction,
                    'alpha_deduction' => $alphaDeduction,
                    'other_deduction' => $otherDeduction,
                    'total_allowance' => $totalAllowance,
                    'total_deduction' => $totalDeduction,
                    'net_salary' => $netSalary,
                    'present_days' => $presentDays,
                    'absent_days' => $absentDays,
                    'shortage_minutes' => $shortageMinutes,
                    'bank_name' => $emp->bank_name ?: 'BCA',
                    'bank_account_number' => $emp->bank_account_number,
                    'bank_account_holder' => $emp->bank_account_holder ?: $empUser->name,
                    'bank_branch' => $emp->bank_branch,
                ]
            );

            $totalPayrollAmount += $netSalary;
        }

        $payroll->update(['total_amount' => $totalPayrollAmount]);

        ActivityLog::record(
            action: 'payroll.generated',
            description: "{$request->user()->name} melakukan generate {$payroll->period_name} ({$employees->count()} karyawan)",
            reference: $payroll,
            user: $request->user(),
        );

        return redirect()->route('payroll.index', ['payroll_id' => $payroll->id])
            ->with('success', "Draft {$payroll->period_name} berhasil di-generate untuk {$employees->count()} karyawan.");
    }

    /**
     * Update manual override components on a draft payroll item (/payroll/items/{item}).
     */
    public function updateItem(Request $request, PayrollItem $item): RedirectResponse
    {
        $payroll = $item->payroll;
        if (! $payroll->isDraft()) {
            return redirect()->back()->with('error', 'Payroll yang sudah difinalisasi tidak dapat diubah.');
        }

        $validated = $request->validate([
            'base_salary' => ['required', 'numeric', 'min:0'],
            'fixed_allowance' => ['required', 'numeric', 'min:0'],
            'overtime_amount' => ['required', 'numeric', 'min:0'],
            'bonus_amount' => ['required', 'numeric', 'min:0'],
            'thr_amount' => ['required', 'numeric', 'min:0'],
            'alpha_deduction' => ['required', 'numeric', 'min:0'],
            'other_deduction' => ['required', 'numeric', 'min:0'],
        ]);

        $totalAllowance = (float) $validated['fixed_allowance']
            + (float) $validated['overtime_amount']
            + (float) $validated['bonus_amount']
            + (float) $validated['thr_amount'];

        $totalDeduction = (float) $validated['alpha_deduction']
            + (float) $validated['other_deduction'];

        $netSalary = max(0, (float) $validated['base_salary'] + $totalAllowance - $totalDeduction);

        $item->update([
            'base_salary' => $validated['base_salary'],
            'fixed_allowance' => $validated['fixed_allowance'],
            'overtime_amount' => $validated['overtime_amount'],
            'bonus_amount' => $validated['bonus_amount'],
            'thr_amount' => $validated['thr_amount'],
            'shortage_deduction' => 0,
            'alpha_deduction' => $validated['alpha_deduction'],
            'other_deduction' => $validated['other_deduction'],
            'total_allowance' => $totalAllowance,
            'total_deduction' => $totalDeduction,
            'net_salary' => $netSalary,
            'is_manual_override' => true,
        ]);

        $payroll->update([
            'total_amount' => $payroll->items()->sum('net_salary'),
        ]);

        return redirect()->back()->with('success', "Komponen gaji {$item->user?->name} berhasil diperbarui.");
    }

    /**
     * Finalize a draft payroll so slips become official (/payroll/{payroll}/finalize).
     */
    public function finalize(Request $request, Payroll $payroll): RedirectResponse
    {
        if (! $payroll->isDraft()) {
            return redirect()->back()->with('error', 'Payroll ini sudah difinalisasi.');
        }

        $payroll->update([
            'status' => 'finalized',
            'finalized_at' => now(),
        ]);

        ActivityLog::record(
            action: 'payroll.finalized',
            description: "{$request->user()->name} memfinalisasi {$payroll->period_name}",
            reference: $payroll,
            user: $request->user(),
        );

        return redirect()->back()->with('success', "{$payroll->period_name} telah difinalisasi. Slip gaji resmi kini tersedia untuk karyawan.");
    }

    /**
     * Mark a finalized payroll as paid (/payroll/{payroll}/mark-paid).
     */
    public function markPaid(Request $request, Payroll $payroll): RedirectResponse
    {
        if ($payroll->status === 'draft') {
            return redirect()->back()->with('error', 'Finalisasi payroll terlebih dahulu sebelum menandai sudah dibayar.');
        }

        $payroll->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        ActivityLog::record(
            action: 'payroll.paid',
            description: "{$request->user()->name} menandai {$payroll->period_name} sudah ditransfer (Paid)",
            reference: $payroll,
            user: $request->user(),
        );

        return redirect()->back()->with('success', "{$payroll->period_name} ditandai Sudah Dibayar.");
    }

    /**
     * Delete a draft payroll period (/payroll/{payroll}).
     */
    public function destroy(Payroll $payroll): RedirectResponse
    {
        if (! $payroll->isDraft()) {
            return redirect()->back()->with('error', 'Hanya payroll berstatus Draft yang dapat dihapus.');
        }

        $name = $payroll->period_name;
        $payroll->delete();

        return redirect()->route('payroll.index')->with('success', "Draft {$name} berhasil dihapus.");
    }

    /**
     * Export CSV formatted to match the BNI / Rekap Bank Transfer template (/payroll/{payroll}/export-bank).
     */
    public function exportBankCsv(Payroll $payroll): StreamedResponse
    {
        $payroll->load('items.user.employee');
        $filename = 'rekap-bank-transfer-'.str_replace(' ', '-', strtolower($payroll->period_name)).'.csv';

        $periodRange = $payroll->start_date->locale('id')->translatedFormat('j M Y')
            .' - '
            .$payroll->end_date->locale('id')->translatedFormat('j M Y');

        return response()->streamDownload(function () use ($payroll, $periodRange): void {
            $handle = fopen('php://output', 'w');

            $writeRow = function (array $fields) use ($handle): void {
                $quoted = array_map(
                    fn (mixed $value): string => '"'.str_replace('"', '""', (string) $value).'"',
                    $fields,
                );
                fwrite($handle, implode(',', $quoted)."\n");
            };

            $writeRow(['Rekap Bank Transfer', '', '', '', '', '', '', '']);
            $writeRow(['Bank Transfer Recap', '', '', '', '', '', '', '']);
            $writeRow(['RIM Project', '', '', '', '', '', '', '']);
            $writeRow([
                'No.',
                'Id Personalia',
                'Nama',
                'Nama Bank',
                'Nama Pemilik Rekening',
                'Nomor Rekening',
                'Kantor Cabang Bank',
                'Jumlah Transfer',
            ]);
            $writeRow([
                'No.',
                'Personel Id',
                'Name',
                'Bank Name',
                'Account Holder Name',
                'Account Number',
                'Bank Branch Offices',
                'Total Transfer',
            ]);
            $subtitle = $payroll->isThr()
                ? "THR Keagamaan — {$payroll->period_name}"
                : "Slip Gaji Bulanan periode {$periodRange}";
            $writeRow([$subtitle, '', '', '', '', '', '', '']);

            foreach ($payroll->items as $idx => $item) {
                $accountNumber = preg_replace('/\D+/', '', (string) ($item->bank_account_number ?? ''));
                $holderName = strtoupper((string) ($item->bank_account_holder ?: ($item->user?->name ?? '')));
                $branch = strtoupper((string) ($item->bank_branch ?: ($item->user?->employee?->bank_branch ?? '')));

                $writeRow([
                    $idx + 1,
                    $item->user_id,
                    $item->user?->name ?? 'Karyawan',
                    strtoupper((string) ($item->bank_name ?: 'BCA')),
                    $holderName,
                    $accountNumber,
                    $branch,
                    (int) round((float) $item->net_salary),
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Display personal payslips for the logged-in employee (/my-slips).
     */
    public function mySlips(Request $request): Response
    {
        $user = $request->user();

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
                'shortage_deduction' => (float) $item->shortage_deduction,
                'alpha_deduction' => (float) $item->alpha_deduction,
                'other_deduction' => (float) $item->other_deduction,
                'total_allowance' => (float) $item->total_allowance,
                'total_deduction' => (float) $item->total_deduction,
                'net_salary' => (float) $item->net_salary,
                'present_days' => $item->present_days,
                'absent_days' => $item->absent_days,
                'shortage_minutes' => $item->shortage_minutes,
                'bank_name' => $item->bank_name ?: 'BCA',
                'bank_account_number' => $item->bank_account_number ?: '-',
                'bank_account_holder' => $item->bank_account_holder ?: $user->name,
            ])->values();

        return Inertia::render('Payroll/MySlips', [
            'slips' => $slips,
        ]);
    }

    /**
     * Render printable / Save-as-PDF official Payslip (/payroll/items/{item}/slip).
     */
    public function printSlip(Request $request, PayrollItem $item): View
    {
        $user = $request->user();
        $item->load(['payroll', 'user.employee']);

        if (! $user->isSuperAdmin()) {
            if ($item->user_id !== $user->id || $item->payroll->isDraft()) {
                abort(403, 'Anda tidak memiliki akses ke slip gaji ini.');
            }
        }

        $officeSetting = OfficeSetting::current();

        return view('payroll.slip', [
            'item' => $item,
            'payroll' => $item->payroll,
            'employeeUser' => $item->user,
            'employee' => $item->user?->employee,
            'office' => $officeSetting,
        ]);
    }
}
