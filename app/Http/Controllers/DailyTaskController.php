<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\DailyTask;
use App\Models\LeaveRequest;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DailyTaskController extends Controller
{
    /**
     * Display the Daily To-Do & Team Work Tracker (/daily-tasks).
     */
    public function index(Request $request): Response
    {
        $user = $request->user()->loadMissing('employee');
        $isSuperAdmin = $user->isSuperAdmin();
        $canManageTeam = $user->isDivisionLead();
        $userDepartment = $user->employee?->department ?: 'Perencanaan';

        $dateInput = $request->string('date')->toString();
        $selectedDate = $dateInput && strtotime($dateInput)
            ? Carbon::parse($dateInput)->startOfDay()
            : Carbon::today();
        $selectedDateStr = $selectedDate->format('Y-m-d');

        $departments = ['Semua', 'Perencanaan', 'Pembangunan', 'Administrasi', 'Digital Marketing'];
        // Super Admin can filter across all divisions; everyone else is strictly scoped to their own division
        $selectedDepartment = $isSuperAdmin
            ? ($request->string('department')->toString() ?: 'Semua')
            : $userDepartment;

        $myTasks = DailyTask::query()
            ->with(['project:id,name,client_name', 'projectTask:id,project_id,title,status', 'assignedBy:id,name'])
            ->where('user_id', $user->id)
            ->forDate($selectedDateStr)
            ->orderByRaw("CASE status WHEN 'in_progress' THEN 0 WHEN 'review' THEN 1 WHEN 'carried_over' THEN 2 WHEN 'done' THEN 3 ELSE 4 END")
            ->orderBy('id')
            ->get()
            ->map(fn (DailyTask $task): array => self::formatDailyTask($task))
            ->values();

        // Count unfinished tasks from the previous 7 days that haven't been carried over yet
        $unfinishedPrevious = $this->getUnfinishedPreviousTasks($user, $selectedDate);

        $accessibleProjects = self::getAccessibleProjectsWithKanbanTasks($user);

        $staffQuery = User::query()
            ->with('employee')
            ->where('is_active', true)
            ->where('role', '!=', UserRole::SuperAdmin)
            ->orderBy('name');

        if ($selectedDepartment !== 'Semua') {
            $staffQuery->whereHas('employee', fn ($q) => $q->where('department', $selectedDepartment));
        }

        $staffUsers = $staffQuery->get();
        $staffIds = $staffUsers->pluck('id')->all();

        $tasksByUser = DailyTask::query()
            ->with(['project:id,name,client_name', 'projectTask:id,project_id,title,status', 'assignedBy:id,name'])
            ->whereIn('user_id', $staffIds)
            ->forDate($selectedDateStr)
            ->orderByRaw("CASE status WHEN 'in_progress' THEN 0 WHEN 'review' THEN 1 WHEN 'carried_over' THEN 2 WHEN 'done' THEN 3 ELSE 4 END")
            ->orderBy('id')
            ->get()
            ->groupBy('user_id');

        $attendancesByUser = Attendance::query()
            ->whereIn('user_id', $staffIds)
            ->whereDate('date', $selectedDateStr)
            ->get()
            ->keyBy('user_id');

        $leavesByUser = LeaveRequest::query()
            ->whereIn('user_id', $staffIds)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $selectedDateStr)
            ->whereDate('end_date', '>=', $selectedDateStr)
            ->get()
            ->keyBy('user_id');

        $totalTasksCount = 0;
        $inReviewCount = 0;
        $doneCount = 0;
        $staffWithPlanCount = 0;

        $teamBoard = $staffUsers->map(function (User $staff) use (
            $tasksByUser,
            $attendancesByUser,
            $leavesByUser,
            &$totalTasksCount,
            &$inReviewCount,
            &$doneCount,
            &$staffWithPlanCount,
        ): array {
            /** @var Collection<int, DailyTask> $userTasks */
            $userTasks = $tasksByUser->get($staff->id, collect());
            $formattedTasks = $userTasks->map(fn (DailyTask $t): array => self::formatDailyTask($t))->values();

            if ($formattedTasks->isNotEmpty()) {
                $staffWithPlanCount++;
            }

            $totalTasksCount += $formattedTasks->count();
            $inReviewCount += $formattedTasks->where('status', 'review')->count();
            $doneCount += $formattedTasks->where('status', 'done')->count();

            $att = $attendancesByUser->get($staff->id);
            $leave = $leavesByUser->get($staff->id);

            $presenceStatus = 'belum_absen';
            $presenceLabel = 'Belum Check-in';
            if ($staff->isFreelancer()) {
                $presenceStatus = 'freelance';
                $presenceLabel = 'Freelance';
            } elseif ($leave) {
                $presenceStatus = 'izin';
                $presenceLabel = ucfirst($leave->type);
            } elseif ($att) {
                if ($att->mode === 'site_visit') {
                    $presenceStatus = 'site_visit';
                    $presenceLabel = 'Site Visit';
                } elseif (in_array($att->status, ['izin', 'cuti', 'sakit', 'ganti_hari'], true)) {
                    $presenceStatus = 'izin';
                    $presenceLabel = ucfirst(str_replace('_', ' ', $att->status));
                } else {
                    $presenceStatus = 'hadir';
                    $presenceLabel = $att->check_out_at ? 'Sudah Pulang' : 'Di Kantor';
                }
            }

            return [
                'id' => $staff->id,
                'name' => $staff->name,
                'photo_url' => $staff->photo_url,
                'position' => $staff->employee?->position ?? 'Staf Studio',
                'department' => $staff->employee?->department ?? 'Perencanaan',
                'is_lead' => $staff->isDivisionLead(),
                'presence_status' => $presenceStatus,
                'presence_label' => $presenceLabel,
                'tasks' => $formattedTasks,
                'done_count' => $formattedTasks->where('status', 'done')->count(),
                'total_count' => $formattedTasks->count(),
            ];
        })->values()->all();

        $summary = [
            'total_staff' => $staffUsers->count(),
            'staff_with_plan' => $staffWithPlanCount,
            'total_tasks' => $totalTasksCount,
            'in_review_count' => $inReviewCount,
            'done_count' => $doneCount,
        ];

        return Inertia::render('DailyTasks/Index', [
            'selectedDate' => $selectedDateStr,
            'selectedDateFormatted' => $selectedDate->translatedFormat('d M Y'),
            'todayDate' => Carbon::today()->format('Y-m-d'),
            'selectedDepartment' => $selectedDepartment,
            'departments' => $departments,
            'canFilterAllDepartments' => $isSuperAdmin,
            'canManageTeam' => $canManageTeam,
            'myTasks' => $myTasks,
            'unfinishedPreviousCount' => $unfinishedPrevious->count(),
            'accessibleProjects' => $accessibleProjects,
            'teamBoard' => $teamBoard,
            'summary' => $summary,
        ]);
    }

    /**
     * Store a new daily task / sub-task under a project or Kanban card (or general non-project task).
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'work_date' => ['nullable', 'date'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'project_task_id' => ['nullable', 'integer', 'exists:project_tasks,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $targetUserId = $user->id;
        $assignedBy = null;

        if (! empty($validated['user_id']) && (int) $validated['user_id'] !== $user->id) {
            if (! $user->isDivisionLead()) {
                abort(403, 'Anda tidak memiliki izin menambahkan to-do untuk karyawan lain.');
            }
            $targetUser = User::query()->with('employee')->findOrFail((int) $validated['user_id']);
            if (! $user->isSuperAdmin()) {
                $userDept = $user->employee?->department ?: 'Perencanaan';
                $targetDept = $targetUser->employee?->department ?: 'Perencanaan';
                if ($userDept !== $targetDept) {
                    abort(403, 'Anda hanya dapat menitipkan tugas untuk anggota di divisi Anda sendiri.');
                }
            }
            $targetUserId = $targetUser->id;
            $assignedBy = $user->id;
        }

        $projectId = ! empty($validated['project_id']) ? (int) $validated['project_id'] : null;
        $projectTaskId = ! empty($validated['project_task_id']) ? (int) $validated['project_task_id'] : null;

        /** @var ProjectTask|null $parentKanban */
        $parentKanban = null;
        if ($projectTaskId) {
            $parentKanban = ProjectTask::query()->with('project')->findOrFail($projectTaskId);
            $projectId = $parentKanban->project_id;
        }

        if ($projectId) {
            $project = Project::query()->findOrFail($projectId);
            if (! $project->isAccessibleBy($user)) {
                abort(403, 'Anda tidak terdaftar pada proyek yang dipilih.');
            }
        }

        $workDate = ! empty($validated['work_date'])
            ? Carbon::parse($validated['work_date'])->format('Y-m-d')
            : Carbon::today()->format('Y-m-d');

        $dailyTask = DailyTask::query()->create([
            'user_id' => $targetUserId,
            'assigned_by' => $assignedBy,
            'work_date' => $workDate,
            'project_id' => $projectId,
            'project_task_id' => $projectTaskId,
            'title' => trim($validated['title']),
            'status' => 'in_progress',
            'notes' => isset($validated['notes']) ? trim((string) $validated['notes']) ?: null : null,
        ]);

        // Move parent Kanban card from 'todo' -> 'in_progress' automatically without creating extra Kanban cards
        if ($parentKanban && $parentKanban->status === 'todo') {
            $parentKanban->update(['status' => 'in_progress']);
            $parentKanban->project?->recalculateProgress();
        }

        ActivityLog::record(
            action: 'daily_task.created',
            description: $assignedBy
                ? "{$user->name} menitipkan to-do harian '{$dailyTask->title}'"
                : "{$user->name} menambahkan fokus hari ini: '{$dailyTask->title}'",
            reference: $dailyTask,
            user: $user,
        );

        return redirect()->back()->with('success', "To-do '{$dailyTask->title}' berhasil ditambahkan.");
    }

    /**
     * Update status, notes, or optionally propose/approve parent Kanban card status.
     */
    public function updateStatus(Request $request, DailyTask $dailyTask): RedirectResponse
    {
        $user = $request->user()->loadMissing('employee');
        $dailyTask->loadMissing('user.employee');

        $canManageTarget = $user->isSuperAdmin()
            || ($user->isDivisionLead()
                && ($user->employee?->department ?: 'Perencanaan') === ($dailyTask->user?->employee?->department ?: 'Perencanaan'));

        if ($dailyTask->user_id !== $user->id && ! $canManageTarget) {
            abort(403, 'Anda tidak memiliki akses untuk mengubah to-do ini.');
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['in_progress', 'review', 'done', 'carried_over'])],
            'review_target' => ['nullable', Rule::in(['pm', 'owner'])],
            'notes' => ['nullable', 'string', 'max:1000'],
            'sync_kanban_status' => ['nullable', Rule::in(['in_progress', 'review', 'done'])],
        ]);

        // If task is currently waiting for Owner (Super Admin) review, only Owner or the task owner can change it
        if (
            $dailyTask->status === 'review'
            && $dailyTask->review_target === 'owner'
            && $dailyTask->user_id !== $user->id
            && ! $user->isSuperAdmin()
        ) {
            abort(403, 'Tugas ini ditujukan untuk review langsung oleh Owner (Super Admin).');
        }

        $newStatus = $validated['status'];
        $reviewTarget = $newStatus === 'review'
            ? ($validated['review_target'] ?? $dailyTask->review_target ?? 'pm')
            : null;

        $updateData = [
            'status' => $newStatus,
            'review_target' => $reviewTarget,
            'completed_at' => $newStatus === 'done' ? now() : null,
        ];

        if ($request->has('notes')) {
            $updateData['notes'] = trim((string) ($validated['notes'] ?? '')) ?: null;
        }

        $dailyTask->update($updateData);

        if ($newStatus === 'review') {
            $targetLabel = $reviewTarget === 'owner' ? 'Owner (Super Admin)' : 'PM / Lead';
            ActivityLog::record(
                action: 'daily_task.review_requested',
                description: "{$user->name} mengajukan review ke {$targetLabel}: '{$dailyTask->title}'",
                reference: $dailyTask,
                user: $user,
            );
        }

        // Optional explicit Kanban parent sync (e.g. employee proposes Review, or PM/Lead approves Done)
        $syncKanban = $validated['sync_kanban_status'] ?? null;
        if ($syncKanban && $dailyTask->project_task_id) {
            if ($syncKanban === 'done' && ! $canManageTarget) {
                abort(403, 'Hanya PM / Lead Divisi yang dapat meng-ACC kartu Kanban induk ke Done.');
            }

            $parentKanban = ProjectTask::query()->with('project')->find($dailyTask->project_task_id);
            if ($parentKanban) {
                $parentKanban->update([
                    'status' => $syncKanban,
                    'completed_at' => $syncKanban === 'done' ? now() : null,
                ]);
                $parentKanban->project?->recalculateProgress();
            }
        }

        return redirect()->back()->with('success', 'Status to-do harian berhasil diperbarui.');
    }

    /**
     * Batch resolve unfinished tasks before checkout or pull yesterday's unfinished tasks into today.
     */
    public function carryOverBatch(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'mode' => ['nullable', Rule::in(['checkout_summary', 'pull_previous'])],
            'target_date' => ['nullable', 'date'],
            'items' => ['nullable', 'array'],
            'items.*.id' => ['required_with:items', 'integer', 'exists:daily_tasks,id'],
            'items.*.action' => ['required_with:items', Rule::in(['done', 'carry_over', 'keep'])],
            'items.*.notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $mode = $validated['mode'] ?? 'checkout_summary';

        if ($mode === 'pull_previous') {
            $targetDate = ! empty($validated['target_date'])
                ? Carbon::parse($validated['target_date'])->startOfDay()
                : Carbon::today();
            $targetDateStr = $targetDate->format('Y-m-d');

            $unfinished = $this->getUnfinishedPreviousTasks($user, $targetDate);
            $pulledCount = 0;

            foreach ($unfinished as $prevTask) {
                $alreadyCarried = DailyTask::query()
                    ->where('user_id', $user->id)
                    ->where('carried_from_id', $prevTask->id)
                    ->exists();

                if ($alreadyCarried) {
                    continue;
                }

                $prevTask->update(['status' => 'carried_over']);

                DailyTask::query()->create([
                    'user_id' => $user->id,
                    'assigned_by' => $prevTask->assigned_by,
                    'work_date' => $targetDateStr,
                    'project_id' => $prevTask->project_id,
                    'project_task_id' => $prevTask->project_task_id,
                    'carried_from_id' => $prevTask->id,
                    'title' => $prevTask->title,
                    'status' => 'in_progress',
                    'notes' => $prevTask->notes,
                ]);

                $pulledCount++;
            }

            return redirect()->back()->with(
                'success',
                $pulledCount > 0
                    ? "{$pulledCount} tugas sebelumnya berhasil ditarik ke Fokus Hari Ini."
                    : 'Tidak ada tugas sebelumnya yang perlu ditarik.',
            );
        }

        $nextWorkDate = $this->resolveNextWorkDate($user, Carbon::today());
        $nextWorkDateStr = $nextWorkDate->format('Y-m-d');

        foreach ($validated['items'] ?? [] as $itemData) {
            $task = DailyTask::query()
                ->where('id', $itemData['id'])
                ->where('user_id', $user->id)
                ->first();

            if (! $task) {
                continue;
            }

            $note = isset($itemData['notes']) ? trim((string) $itemData['notes']) ?: $task->notes : $task->notes;

            if ($itemData['action'] === 'done') {
                $task->update([
                    'status' => 'done',
                    'notes' => $note,
                    'completed_at' => now(),
                ]);
            } elseif ($itemData['action'] === 'carry_over') {
                $task->update([
                    'status' => 'carried_over',
                    'notes' => $note,
                ]);

                $alreadyExists = DailyTask::query()
                    ->where('user_id', $user->id)
                    ->where('carried_from_id', $task->id)
                    ->whereDate('work_date', $nextWorkDateStr)
                    ->exists();

                if (! $alreadyExists) {
                    DailyTask::query()->create([
                        'user_id' => $user->id,
                        'assigned_by' => $task->assigned_by,
                        'work_date' => $nextWorkDateStr,
                        'project_id' => $task->project_id,
                        'project_task_id' => $task->project_task_id,
                        'carried_from_id' => $task->id,
                        'title' => $task->title,
                        'status' => 'in_progress',
                        'notes' => $note,
                    ]);
                }
            }
        }

        return redirect()->back()->with('success', 'Ringkasan to-do hari ini berhasil disimpan.');
    }

    /**
     * Delete a daily task item (does not delete parent Kanban card).
     */
    public function destroy(Request $request, DailyTask $dailyTask): RedirectResponse
    {
        $user = $request->user();

        if ($dailyTask->user_id !== $user->id && ! $user->isAdmin()) {
            abort(403, 'Anda tidak memiliki akses untuk menghapus to-do ini.');
        }

        $title = $dailyTask->title;
        $dailyTask->delete();

        return redirect()->back()->with('success', "To-do '{$title}' berhasil dihapus.");
    }

    /**
     * Format a DailyTask model for Inertia props.
     *
     * @return array<string, mixed>
     */
    public static function formatDailyTask(DailyTask $task): array
    {
        return [
            'id' => $task->id,
            'user_id' => $task->user_id,
            'work_date' => $task->work_date->format('Y-m-d'),
            'title' => $task->title,
            'status' => $task->status,
            'review_target' => $task->review_target,
            'notes' => $task->notes,
            'is_carried_over' => $task->carried_from_id !== null,
            'project_id' => $task->project_id,
            'project_name' => $task->project?->name,
            'project_task_id' => $task->project_task_id,
            'project_task_title' => $task->projectTask?->title,
            'project_task_status' => $task->projectTask?->status,
            'assigned_by_name' => $task->assignedBy?->name,
            'completed_at' => $task->completed_at?->format('H:i'),
        ];
    }

    /**
     * Fetch projects accessible to the user along with their active Kanban tasks for sub-task linking.
     *
     * @return array<int, array{id: int, name: string, client_name: string|null, tasks: array<int, array{id: int, title: string, status: string}>}>
     */
    public static function getAccessibleProjectsWithKanbanTasks(User $user): array
    {
        $query = Project::query()
            ->with(['tasks' => fn ($q) => $q->where('status', '!=', 'done')->orderBy('order_column')->select(['id', 'project_id', 'title', 'status'])])
            ->whereIn('status', ['survey', 'planning', 'ongoing', 'review'])
            ->orderBy('name');

        if (! $user->isAdmin()) {
            $query->where(function ($q) use ($user): void {
                $q->where('owner_id', $user->id)
                    ->orWhereHas('members', fn ($mq) => $mq->where('users.id', $user->id));
            });
        }

        return $query
            ->get(['id', 'name', 'client_name'])
            ->map(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'client_name' => $project->client_name,
                'tasks' => $project->tasks->map(fn (ProjectTask $t): array => [
                    'id' => $t->id,
                    'title' => $t->title,
                    'status' => $t->status,
                ])->values()->all(),
            ])
            ->values()
            ->all();
    }

    /**
     * Get unfinished daily tasks from the previous 7 days that have not yet been carried over.
     *
     * @return Collection<int, DailyTask>
     */
    private function getUnfinishedPreviousTasks(User $user, Carbon $referenceDate): Collection
    {
        $startWindow = $referenceDate->copy()->subDays(7)->format('Y-m-d');
        $endWindow = $referenceDate->copy()->subDay()->format('Y-m-d');

        return DailyTask::query()
            ->where('user_id', $user->id)
            ->whereBetween('work_date', [$startWindow, $endWindow])
            ->whereIn('status', ['in_progress', 'review'])
            ->orderByDesc('work_date')
            ->get();
    }

    /**
     * Resolve the next working day for carry-over (skipping weekly off-days).
     */
    private function resolveNextWorkDate(User $user, Carbon $fromDate): Carbon
    {
        $candidate = $fromDate->copy()->addDay();
        for ($i = 0; $i < 7; $i++) {
            if (! $user->isOffDay($candidate)) {
                return $candidate;
            }
            $candidate->addDay();
        }

        return $fromDate->copy()->addDay();
    }
}
