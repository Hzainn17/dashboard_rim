<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\ProjectTask;
use App\Models\ProjectUpdate;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    /**
     * Display a listing of projects (/projects).
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user->isAdmin();

        $search = $request->string('search')->trim()->value();
        $category = $request->string('category')->trim()->value();
        $status = $request->string('status')->trim()->value();
        $tab = $request->input('tab', $isAdmin ? 'all' : 'my');

        $query = Project::query()
            ->with(['stages', 'members.employee', 'tasks'])
            ->withCount([
                'tasks as total_tasks_count',
                'tasks as done_tasks_count' => fn ($q) => $q->where('status', 'done'),
            ]);

        if (! $isAdmin || $tab === 'my') {
            $query->where(function ($q) use ($user): void {
                $q->where('owner_id', $user->id)
                    ->orWhereHas('members', fn ($mq) => $mq->where('users.id', $user->id));
            });
        }

        if ($search) {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('client_name', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        if ($category && $category !== 'all') {
            $query->where('category', $category);
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $allProjectsForMetrics = Project::query()->get();
        $today = Carbon::today();

        $metrics = [
            'total_projects' => $allProjectsForMetrics->count(),
            'ongoing_projects' => $allProjectsForMetrics->where('status', 'ongoing')->count(),
            'review_projects' => $allProjectsForMetrics->where('status', 'review')->count(),
            'done_projects' => $allProjectsForMetrics->where('status', 'done')->count(),
            'urgent_projects' => $allProjectsForMetrics->filter(function (Project $p) use ($today): bool {
                return $p->status !== 'done' && $p->due_date && $p->due_date->diffInDays($today, false) <= 0 && $today->diffInDays($p->due_date, false) <= 7;
            })->count(),
        ];

        $projects = $query
            ->orderByRaw('CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC')
            ->get()
            ->map(function (Project $p) use ($today): array {
                $daysLeft = null;
                if ($p->due_date) {
                    $diff = $today->diffInDays($p->due_date, false);
                    $daysLeft = (int) $diff;
                }

                $activeStage = $p->stages->firstWhere('status', 'active') ?? $p->stages->first();
                $phase = $activeStage ? preg_replace('/^\d+\.\s*/', '', $activeStage->name) : 'Konsep';
                if ($p->status === 'done') {
                    $phase = 'Selesai';
                } elseif ($p->status === 'review' && ! $activeStage) {
                    $phase = 'Asistensi';
                }

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'client_name' => $p->client_name,
                    'client_phone' => $p->client_phone,
                    'location' => $p->location,
                    'category' => $p->category ?: 'Residensial',
                    'phase' => $phase,
                    'cover_image_url' => $p->cover_image_url ?: '/project-covers/rumah-tropis.png',
                    'drive_url' => $p->drive_url,
                    'description' => $p->description,
                    'status' => $p->status,
                    'progress_percent' => $p->progress_percent,
                    'start_date' => $p->start_date?->format('Y-m-d'),
                    'due_date' => $p->due_date?->format('Y-m-d'),
                    'due_date_formatted' => $p->due_date?->translatedFormat('d M Y'),
                    'days_left' => $daysLeft,
                    'total_tasks' => (int) ($p->total_tasks_count ?? $p->tasks->count()),
                    'done_tasks' => (int) ($p->done_tasks_count ?? $p->tasks->where('status', 'done')->count()),
                    'stages_count' => $p->stages->count(),
                    'members' => $p->members->map(fn (User $u) => [
                        'id' => $u->id,
                        'name' => $u->name,
                        'photo_url' => $u->photo_url,
                        'role_in_project' => $u->pivot->role_in_project ?? 'Anggota',
                        'position' => $u->employee?->position ?? 'Arsitek',
                    ])->values(),
                ];
            });

        $teamMembers = User::query()
            ->with('employee')
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'employee_code' => $u->employee?->employee_code ?? sprintf('RIM-%03d', $u->id),
                'position' => $u->employee?->position ?? 'Arsitek',
                'department' => $u->employee?->department ?? 'Perencanaan',
                'photo_url' => $u->photo_url,
            ]);

        $categories = [
            'Residensial',
            'Komersial',
            'Interior',
            'Villa & Resort',
            'Masterplan & Lanskap',
        ];

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
            'metrics' => $metrics,
            'filters' => [
                'search' => $search,
                'category' => $category,
                'status' => $status,
                'tab' => $tab,
            ],
            'categories' => $categories,
            'teamMembers' => $teamMembers,
        ]);
    }

    /**
     * Store a newly created project (/projects).
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (! $user->isAdmin()) {
            abort(403, 'Hanya Admin yang dapat membuat proyek baru.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'client_name' => ['required', 'string', 'max:255'],
            'client_phone' => ['nullable', 'string', 'max:30'],
            'location' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:50'],
            'cover_image_url' => ['nullable', 'string', 'max:500'],
            'drive_url' => ['nullable', 'url', 'max:500'],
            'description' => ['nullable', 'string', 'max:2000'],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['required', Rule::in(['planning', 'ongoing', 'review', 'done', 'on_hold'])],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => ['exists:users,id'],
            'lead_id' => ['nullable', 'exists:users,id'],
            'stages' => ['nullable', 'array'],
            'stages.*' => ['string', 'max:100'],
        ]);

        $project = Project::query()->create([
            'name' => $validated['name'],
            'client_name' => $validated['client_name'],
            'client_phone' => $validated['client_phone'] ?? null,
            'location' => $validated['location'] ?? null,
            'category' => ! empty($validated['category']) ? $validated['category'] : 'Residensial',
            'cover_image_url' => ! empty($validated['cover_image_url']) ? $validated['cover_image_url'] : '/project-covers/rumah-tropis.png',
            'drive_url' => $validated['drive_url'] ?? null,
            'description' => $validated['description'] ?? null,
            'start_date' => $validated['start_date'] ?? now()->format('Y-m-d'),
            'due_date' => $validated['due_date'] ?? null,
            'status' => $validated['status'],
            'progress_percent' => 0,
            'owner_id' => $user->id,
        ]);

        // Attach members
        $memberIds = collect($validated['member_ids'] ?? []);
        if (! empty($validated['lead_id'])) {
            $memberIds->push((int) $validated['lead_id']);
        }
        $memberIds = $memberIds->unique();

        $attachData = [];
        foreach ($memberIds as $mId) {
            $isLead = ! empty($validated['lead_id']) && (int) $mId === (int) $validated['lead_id'];
            $attachData[$mId] = [
                'role_in_project' => $isLead ? 'Lead Architect' : 'Tim Desain',
            ];
        }
        if (! empty($attachData)) {
            $project->members()->attach($attachData);
        }

        // Create stages
        $stageNames = ! empty($validated['stages'])
            ? array_filter($validated['stages'])
            : ['1. Konsep Desain & Denah', '2. Pengembangan Desain', '3. Gambar Kerja (DED)', '4. 3D Render & Visualisasi', '5. Pengawasan'];

        foreach (array_values($stageNames) as $order => $stageName) {
            $project->stages()->create([
                'name' => $stageName,
                'order' => $order + 1,
                'status' => $order === 0 ? 'active' : 'pending',
            ]);
        }

        ActivityLog::record(
            action: 'project.created',
            description: "{$user->name} membuat proyek baru: {$project->name}",
            reference: $project,
            user: $user,
        );

        return redirect()->route('projects.show', $project->id)
            ->with('success', "Proyek '{$project->name}' berhasil dibuat.");
    }

    /**
     * Display a specific project with Notion-style Kanban board and details (/projects/{project}).
     */
    public function show(Request $request, Project $project): Response
    {
        $today = Carbon::today();

        $project->load([
            'owner:id,name,email',
            'members.employee',
            'stages' => fn ($q) => $q->orderBy('order'),
            'tasks.assignee.employee',
            'tasks.stage',
            'updates.user.employee',
        ]);

        $project->recalculateProgress();

        $daysLeft = null;
        if ($project->due_date) {
            $daysLeft = (int) $today->diffInDays($project->due_date, false);
        }

        $allTasks = $project->tasks->sortBy('order_column')->values();

        $kanban = [
            'todo' => $allTasks->where('status', 'todo')->values()->map(fn (ProjectTask $t) => $this->formatTask($t)),
            'in_progress' => $allTasks->where('status', 'in_progress')->values()->map(fn (ProjectTask $t) => $this->formatTask($t)),
            'review' => $allTasks->where('status', 'review')->values()->map(fn (ProjectTask $t) => $this->formatTask($t)),
            'done' => $allTasks->where('status', 'done')->values()->map(fn (ProjectTask $t) => $this->formatTask($t)),
        ];

        $teamMembers = User::query()
            ->with('employee')
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'employee_code' => $u->employee?->employee_code ?? sprintf('RIM-%03d', $u->id),
                'position' => $u->employee?->position ?? 'Arsitek',
                'department' => $u->employee?->department ?? 'Perencanaan',
                'photo_url' => $u->photo_url,
            ]);

        return Inertia::render('Projects/Show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'client_name' => $project->client_name,
                'client_phone' => $project->client_phone,
                'location' => $project->location,
                'category' => $project->category ?: 'Residensial',
                'cover_image_url' => $project->cover_image_url ?: '/project-covers/rumah-tropis.png',
                'drive_url' => $project->drive_url,
                'description' => $project->description,
                'status' => $project->status,
                'progress_percent' => $project->progress_percent,
                'start_date' => $project->start_date?->format('Y-m-d'),
                'due_date' => $project->due_date?->format('Y-m-d'),
                'due_date_formatted' => $project->due_date?->translatedFormat('d M Y'),
                'days_left' => $daysLeft,
                'total_tasks' => $allTasks->count(),
                'done_tasks' => $allTasks->where('status', 'done')->count(),
                'owner' => [
                    'id' => $project->owner?->id,
                    'name' => $project->owner?->name ?? 'Admin',
                ],
                'members' => $project->members->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'photo_url' => $u->photo_url,
                    'role_in_project' => $u->pivot->role_in_project ?? 'Tim Desain',
                    'position' => $u->employee?->position ?? 'Arsitek',
                    'employee_code' => $u->employee?->employee_code ?? sprintf('RIM-%03d', $u->id),
                ])->values(),
                'stages' => $project->stages->map(fn (ProjectStage $s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'order' => $s->order,
                    'status' => $s->status,
                    'tasks_count' => $allTasks->where('stage_id', $s->id)->count(),
                    'done_count' => $allTasks->where('stage_id', $s->id)->where('status', 'done')->count(),
                ])->values(),
            ],
            'kanban' => $kanban,
            'updates' => $project->updates->map(fn (ProjectUpdate $u) => [
                'id' => $u->id,
                'content' => $u->content,
                'created_at' => $u->created_at->translatedFormat('d M Y, H:i'),
                'created_at_human' => $u->created_at->diffForHumans(),
                'user' => [
                    'id' => $u->user?->id,
                    'name' => $u->user?->name ?? 'Tim RIM',
                    'position' => $u->user?->employee?->position ?? 'Arsitek',
                    'photo_url' => $u->user?->photo_url,
                ],
            ])->values(),
            'teamMembers' => $teamMembers,
        ]);
    }

    /**
     * Update project details (/projects/{project}).
     */
    public function update(Request $request, Project $project): RedirectResponse
    {
        $user = $request->user();
        if (! $user->isAdmin() && $project->owner_id !== $user->id) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'client_name' => ['required', 'string', 'max:255'],
            'client_phone' => ['nullable', 'string', 'max:30'],
            'location' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:50'],
            'cover_image_url' => ['nullable', 'string', 'max:500'],
            'drive_url' => ['nullable', 'url', 'max:500'],
            'description' => ['nullable', 'string', 'max:2000'],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['required', Rule::in(['planning', 'ongoing', 'review', 'done', 'on_hold'])],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => ['exists:users,id'],
            'lead_id' => ['nullable', 'exists:users,id'],
        ]);

        $project->update([
            'name' => $validated['name'],
            'client_name' => $validated['client_name'],
            'client_phone' => $validated['client_phone'] ?? null,
            'location' => $validated['location'] ?? null,
            'category' => $validated['category'] ?: 'Residensial',
            'cover_image_url' => $validated['cover_image_url'] ?? $project->cover_image_url,
            'drive_url' => $validated['drive_url'] ?? null,
            'description' => $validated['description'] ?? null,
            'start_date' => $validated['start_date'] ?? $project->start_date,
            'due_date' => $validated['due_date'] ?? null,
            'status' => $validated['status'],
        ]);

        if (isset($validated['member_ids'])) {
            $memberIds = collect($validated['member_ids']);
            if (! empty($validated['lead_id'])) {
                $memberIds->push((int) $validated['lead_id']);
            }
            $memberIds = $memberIds->unique();

            $syncData = [];
            foreach ($memberIds as $mId) {
                $isLead = ! empty($validated['lead_id']) && (int) $mId === (int) $validated['lead_id'];
                $syncData[$mId] = [
                    'role_in_project' => $isLead ? 'Lead Architect' : 'Tim Desain',
                ];
            }
            $project->members()->sync($syncData);
        }

        $project->recalculateProgress();

        ActivityLog::record(
            action: 'project.updated',
            description: "{$user->name} memperbarui informasi proyek {$project->name}",
            reference: $project,
            user: $user,
        );

        return redirect()->back()->with('success', 'Informasi proyek berhasil diperbarui.');
    }

    /**
     * Delete a project (/projects/{project}).
     */
    public function destroy(Request $request, Project $project): RedirectResponse
    {
        $user = $request->user();
        if (! $user->isAdmin()) {
            abort(403, 'Hanya Admin yang dapat menghapus proyek.');
        }

        $name = $project->name;
        $project->delete();

        ActivityLog::record(
            action: 'project.deleted',
            description: "{$user->name} menghapus proyek {$name}",
            user: $user,
        );

        return redirect()->route('projects.index')
            ->with('success', "Proyek '{$name}' berhasil dihapus.");
    }

    /**
     * Create a new task within a project (/projects/{project}/tasks).
     */
    public function storeTask(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'stage_id' => ['nullable', 'exists:project_stages,id'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'status' => ['required', Rule::in(['todo', 'in_progress', 'review', 'done'])],
            'priority' => ['required', Rule::in(['low', 'medium', 'high'])],
            'due_date' => ['nullable', 'date'],
        ]);

        $maxOrder = (int) $project->tasks()->max('order_column');

        $task = $project->tasks()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'stage_id' => $validated['stage_id'] ?? null,
            'assignee_id' => $validated['assignee_id'] ?? null,
            'status' => $validated['status'],
            'priority' => $validated['priority'],
            'order_column' => $maxOrder + 1,
            'due_date' => $validated['due_date'] ?? null,
            'completed_at' => $validated['status'] === 'done' ? now() : null,
        ]);

        $project->recalculateProgress();

        ActivityLog::record(
            action: 'task.created',
            description: "{$request->user()->name} membuat tugas baru '{$task->title}' pada {$project->name}",
            reference: $task,
            user: $request->user(),
        );

        return redirect()->back()->with('success', "Tugas '{$task->title}' berhasil ditambahkan.");
    }

    /**
     * Update an existing task (/projects/{project}/tasks/{task}).
     */
    public function updateTask(Request $request, Project $project, ProjectTask $task): RedirectResponse
    {
        if ($task->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'stage_id' => ['nullable', 'exists:project_stages,id'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'status' => ['required', Rule::in(['todo', 'in_progress', 'review', 'done'])],
            'priority' => ['required', Rule::in(['low', 'medium', 'high'])],
            'due_date' => ['nullable', 'date'],
        ]);

        $completedAt = $task->completed_at;
        if ($validated['status'] === 'done' && $task->status !== 'done') {
            $completedAt = now();
        } elseif ($validated['status'] !== 'done') {
            $completedAt = null;
        }

        $task->update([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'stage_id' => $validated['stage_id'] ?? null,
            'assignee_id' => $validated['assignee_id'] ?? null,
            'status' => $validated['status'],
            'priority' => $validated['priority'],
            'due_date' => $validated['due_date'] ?? null,
            'completed_at' => $completedAt,
        ]);

        $project->recalculateProgress();

        return redirect()->back()->with('success', "Tugas '{$task->title}' berhasil diperbarui.");
    }

    /**
     * Move task status (Notion-style drag & drop or quick move) (/projects/{project}/tasks/{task}/status).
     */
    public function updateTaskStatus(Request $request, Project $project, ProjectTask $task): RedirectResponse
    {
        if ($task->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['todo', 'in_progress', 'review', 'done'])],
            'order_column' => ['nullable', 'integer'],
        ]);

        $newStatus = $validated['status'];
        $completedAt = $newStatus === 'done' ? now() : null;

        $task->update([
            'status' => $newStatus,
            'completed_at' => $completedAt,
            'order_column' => $validated['order_column'] ?? $task->order_column,
        ]);

        $project->recalculateProgress();

        $statusLabels = [
            'todo' => 'To Do',
            'in_progress' => 'In Progress',
            'review' => 'In Review',
            'done' => 'Done',
        ];

        return redirect()->back()->with(
            'success',
            "Status '{$task->title}' dipindahkan ke {$statusLabels[$newStatus]}."
        );
    }

    /**
     * Delete a task (/projects/{project}/tasks/{task}).
     */
    public function destroyTask(Request $request, Project $project, ProjectTask $task): RedirectResponse
    {
        if ($task->project_id !== $project->id) {
            abort(404);
        }

        $title = $task->title;
        $task->delete();

        $project->recalculateProgress();

        return redirect()->back()->with('success', "Tugas '{$title}' berhasil dihapus.");
    }

    /**
     * Post a progress update / report feed (/projects/{project}/updates).
     */
    public function storeUpdate(Request $request, Project $project): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
        ]);

        $update = $project->updates()->create([
            'user_id' => $user->id,
            'content' => $validated['content'],
        ]);

        ActivityLog::record(
            action: 'project.update_posted',
            description: "{$user->name} menambahkan update perkembangan pada {$project->name}",
            reference: $update,
            user: $user,
        );

        return redirect()->back()->with('success', 'Catatan perkembangan proyek berhasil ditambahkan.');
    }

    /**
     * Add a custom stage to the project (/projects/{project}/stages).
     */
    public function storeStage(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        $maxOrder = (int) $project->stages()->max('order');

        $project->stages()->create([
            'name' => $validated['name'],
            'order' => $maxOrder + 1,
            'status' => 'pending',
        ]);

        return redirect()->back()->with('success', "Tahapan '{$validated['name']}' berhasil ditambahkan.");
    }

    /**
     * Delete a stage (/projects/{project}/stages/{stage}).
     */
    public function destroyStage(Request $request, Project $project, ProjectStage $stage): RedirectResponse
    {
        if ($stage->project_id !== $project->id) {
            abort(404);
        }

        $name = $stage->name;
        $stage->delete();

        return redirect()->back()->with('success', "Tahapan '{$name}' berhasil dihapus.");
    }

    /**
     * Helper to format a task for frontend.
     *
     * @return array<string, mixed>
     */
    private function formatTask(ProjectTask $t): array
    {
        return [
            'id' => $t->id,
            'project_id' => $t->project_id,
            'stage_id' => $t->stage_id,
            'stage_name' => $t->stage?->name,
            'title' => $t->title,
            'description' => $t->description,
            'status' => $t->status,
            'priority' => $t->priority,
            'order_column' => $t->order_column,
            'due_date' => $t->due_date?->format('Y-m-d'),
            'due_date_formatted' => $t->due_date?->translatedFormat('d M'),
            'completed_at' => $t->completed_at?->toIso8601String(),
            'assignee' => $t->assignee ? [
                'id' => $t->assignee->id,
                'name' => $t->assignee->name,
                'photo_url' => $t->assignee->photo_url,
                'position' => $t->assignee->employee?->position ?? 'Arsitek',
            ] : null,
        ];
    }
}
