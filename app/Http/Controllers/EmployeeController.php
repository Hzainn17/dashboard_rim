<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Models\ActivityLog;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\Project;
use App\Models\ProjectUpdate;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    /**
     * Display the employee directory and management view.
     */
    public function index(Request $request): Response
    {
        $isAdmin = (bool) $request->user()?->isAdmin();

        $users = User::query()
            ->with('employee')
            ->orderBy('id')
            ->get();

        $employees = $users->map(function (User $user) use ($isAdmin): array {
            $emp = $user->employee;

            $data = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role->value,
                'is_active' => $user->is_active,
                'photo_url' => $user->photo_url,
                'employee_code' => $emp?->employee_code ?? sprintf('RIM-%03d', $user->id),
                'position' => $emp?->position ?? ($user->isAdmin() ? 'Principal Architect' : 'Staf Studio'),
                'department' => $emp?->department ?? 'Perencanaan',
                'work_type' => $emp?->work_type ?? 'kantor',
                'join_date' => $emp?->join_date?->format('Y-m-d') ?? $user->created_at?->format('Y-m-d'),
                'employment_status' => $emp?->employment_status ?? 'tetap',
                'annual_leave_quota' => $emp?->annual_leave_quota ?? 12,
            ];

            if ($isAdmin) {
                $data['base_salary'] = (float) ($emp?->base_salary ?? 0);
                $data['fixed_allowance'] = (float) ($emp?->fixed_allowance ?? 0);
                $data['overtime_rate_per_hour'] = (float) ($emp?->overtime_rate_per_hour ?? 25000);
                $data['bank_name'] = $emp?->bank_name ?? 'BCA';
                $data['bank_account_number'] = $emp?->bank_account_number ?? '';
                $data['bank_account_holder'] = $emp?->bank_account_holder ?? $user->name;
                $data['bank_branch'] = $emp?->bank_branch ?? '';
            }

            return $data;
        });

        $stats = [
            'total' => $users->count(),
            'active' => $users->where('is_active', true)->count(),
            'tetap' => $users->filter(fn (User $u) => ($u->employee?->employment_status ?? 'tetap') === 'tetap')->count(),
            'kontrak' => $users->filter(fn (User $u) => $u->employee?->employment_status === 'kontrak')->count(),
            'magang' => $users->filter(fn (User $u) => $u->employee?->employment_status === 'magang')->count(),
        ];

        $nextNumber = Employee::query()->count() + 1;
        $nextCode = sprintf('RIM-%03d', $nextNumber);
        while (Employee::query()->where('employee_code', $nextCode)->exists()) {
            $nextNumber++;
            $nextCode = sprintf('RIM-%03d', $nextNumber);
        }

        return Inertia::render('Employees/Index', [
            'employees' => $employees->values(),
            'stats' => $stats,
            'nextEmployeeCode' => $nextCode,
        ]);
    }

    /**
     * Store a newly registered studio employee.
     */
    public function store(StoreEmployeeRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $user = DB::transaction(function () use ($validated): User {
            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'phone' => $validated['phone'] ?? null,
                'role' => $validated['role'],
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            $user->employee()->create([
                'employee_code' => $validated['employee_code'],
                'position' => $validated['position'],
                'department' => $validated['department'] ?? 'Perencanaan',
                'work_type' => $validated['work_type'] ?? 'kantor',
                'join_date' => $validated['join_date'],
                'employment_status' => $validated['employment_status'],
                'annual_leave_quota' => $validated['annual_leave_quota'],
                'base_salary' => $validated['base_salary'],
                'fixed_allowance' => $validated['fixed_allowance'] ?? 0,
                'overtime_rate_per_hour' => $validated['overtime_rate_per_hour'] ?? 25000,
                'bank_name' => $validated['bank_name'] ?? 'BCA',
                'bank_account_number' => $validated['bank_account_number'] ?? null,
                'bank_account_holder' => $validated['bank_account_holder'] ?? $validated['name'],
                'bank_branch' => $validated['bank_branch'] ?? null,
            ]);

            return $user;
        });

        ActivityLog::record(
            action: 'employee.created',
            description: "Mendaftarkan karyawan baru: {$user->name} ({$validated['employee_code']})",
            reference: $user,
            user: $request->user(),
        );

        return redirect()->route('employees.index')->with('success', "Karyawan {$user->name} berhasil didaftarkan.");
    }

    /**
     * Update an existing studio employee.
     */
    public function update(UpdateEmployeeRequest $request, User $employee): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($employee, $validated): void {
            $userUpdate = [
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'role' => $validated['role'],
            ];

            if (! empty($validated['password'])) {
                $userUpdate['password'] = Hash::make($validated['password']);
            }

            $employee->update($userUpdate);

            $employee->employee()->updateOrCreate(
                ['user_id' => $employee->id],
                [
                    'employee_code' => $validated['employee_code'],
                    'position' => $validated['position'],
                    'department' => $validated['department'] ?? 'Perencanaan',
                    'work_type' => $validated['work_type'] ?? 'kantor',
                    'join_date' => $validated['join_date'],
                    'employment_status' => $validated['employment_status'],
                    'annual_leave_quota' => $validated['annual_leave_quota'],
                    'base_salary' => $validated['base_salary'],
                    'fixed_allowance' => $validated['fixed_allowance'] ?? 0,
                    'overtime_rate_per_hour' => $validated['overtime_rate_per_hour'] ?? 25000,
                    'bank_name' => $validated['bank_name'] ?? 'BCA',
                    'bank_account_number' => $validated['bank_account_number'] ?? null,
                    'bank_account_holder' => $validated['bank_account_holder'] ?? $validated['name'],
                    'bank_branch' => $validated['bank_branch'] ?? null,
                ],
            );
        });

        ActivityLog::record(
            action: 'employee.updated',
            description: "Memperbarui data karyawan: {$employee->name}",
            reference: $employee,
            user: $request->user(),
        );

        return redirect()->route('employees.index')->with('success', "Data {$employee->name} berhasil diperbarui.");
    }

    /**
     * Toggle active status of an employee account.
     */
    public function toggleStatus(Request $request, User $employee): RedirectResponse
    {
        if (! $request->user()?->isAdmin()) {
            abort(403);
        }

        if ($employee->id === $request->user()->id) {
            return redirect()->route('employees.index')->with('error', 'Anda tidak dapat menonaktifkan akun Anda sendiri.');
        }

        $employee->update([
            'is_active' => ! $employee->is_active,
        ]);

        $statusLabel = $employee->is_active ? 'diaktifkan kembali' : 'dinonaktifkan';

        ActivityLog::record(
            action: 'employee.status_toggled',
            description: "Akun {$employee->name} {$statusLabel}",
            reference: $employee,
            user: $request->user(),
        );

        return redirect()->route('employees.index')->with('success', "Akun {$employee->name} berhasil {$statusLabel}.");
    }

    /**
     * Permanently delete an employee account and reassign/clean up restricted references.
     */
    public function destroy(Request $request, User $employee): RedirectResponse
    {
        if (! $request->user()?->isAdmin()) {
            abort(403);
        }

        if ($employee->id === $request->user()->id) {
            return redirect()->route('employees.index')->with('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
        }

        $deletedName = $employee->name;

        DB::transaction(function () use ($request, $employee): void {
            Project::query()
                ->where('owner_id', $employee->id)
                ->update(['owner_id' => $request->user()->id]);

            Payroll::query()
                ->where('generated_by', $employee->id)
                ->update(['generated_by' => $request->user()->id]);

            ProjectUpdate::query()
                ->where('user_id', $employee->id)
                ->delete();

            PayrollItem::query()
                ->where('user_id', $employee->id)
                ->delete();

            if ($employee->photo_url && str_starts_with($employee->photo_url, '/uploads/avatars/')) {
                $photoPath = public_path(ltrim($employee->photo_url, '/'));
                if (File::exists($photoPath)) {
                    File::delete($photoPath);
                }
            }

            $employee->delete();
        });

        ActivityLog::record(
            action: 'employee.deleted',
            description: "{$request->user()->name} menghapus permanen karyawan: {$deletedName}",
            user: $request->user(),
        );

        return redirect()->route('employees.index')->with('success', "Karyawan {$deletedName} berhasil dihapus permanen.");
    }
}
