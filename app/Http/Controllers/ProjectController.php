<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\DailyTask;
use App\Models\OfficeSetting;
use App\Models\Project;
use App\Models\ProjectClientBrief;
use App\Models\ProjectStage;
use App\Models\ProjectTask;
use App\Models\ProjectUpdate;
use App\Models\User;
use App\Services\ClientBriefTemplate;
use App\Services\ProjectPackageService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    /**
     * Display a listing of planning/design projects (/projects).
     */
    public function index(Request $request): Response|RedirectResponse
    {
        if (! $request->user()->isAdmin() && $request->user()->isFieldWorker()) {
            return redirect()->route('projects.field');
        }

        return $this->renderProjectIndex($request, 'planning');
    }

    /**
     * Display a listing of construction/field projects (/field-projects).
     */
    public function fieldIndex(Request $request): Response|RedirectResponse
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isFieldWorker()) {
            return redirect()->route('projects.index');
        }

        return $this->renderProjectIndex($request, 'field');
    }

    /**
     * Render the unified project management view scoped to either planning or field.
     */
    private function renderProjectIndex(Request $request, string $section): Response
    {
        $user = $request->user();
        $isAdmin = $user->isAdmin();

        $search = $request->string('search')->trim()->value();
        $category = $request->string('category')->trim()->value();
        $status = $request->string('status')->trim()->value();
        $projectType = $request->string('type')->trim()->value();
        $tab = $request->input('tab', 'active');
        if (! in_array($tab, ['active', 'survey'], true)) {
            $tab = 'active';
        }

        $sectionTypes = $section === 'field'
            ? Project::FIELD_TYPES
            : ['perencanaan'];

        $query = Project::query()
            ->with(['stages', 'members.employee', 'tasks'])
            ->withCount([
                'tasks as total_tasks_count',
                'tasks as done_tasks_count' => fn ($q) => $q->where('status', 'done'),
            ]);

        if (! $isAdmin) {
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
            $query->where(function ($q) use ($category): void {
                $q->where('package_name', $category)
                    ->orWhere('category', $category);
            });
        }

        if ($tab === 'survey') {
            $query->where('status', 'survey');
        } elseif ($status && $status !== 'all') {
            $query->where('status', $status);
        } else {
            $query->where('status', '!=', 'survey');
        }

        if ($projectType === 'lapangan') {
            $query->whereIn('project_type', Project::FIELD_TYPES);
        } elseif ($projectType && array_key_exists($projectType, Project::TYPES)) {
            $query->where('project_type', $projectType);
        } else {
            $query->whereIn('project_type', $sectionTypes);
        }

        $metricsQuery = Project::query()
            ->whereIn('project_type', $sectionTypes);

        if (! $isAdmin) {
            $metricsQuery->where(function ($q) use ($user): void {
                $q->where('owner_id', $user->id)
                    ->orWhereHas('members', fn ($mq) => $mq->where('users.id', $user->id));
            });
        }

        $allProjectsForMetrics = $metricsQuery->get();
        $today = Carbon::today();

        $metrics = [
            'total_projects' => $allProjectsForMetrics->where('status', '!=', 'survey')->count(),
            'survey_projects' => $allProjectsForMetrics->where('status', 'survey')->count(),
            'ongoing_projects' => $allProjectsForMetrics->where('status', 'ongoing')->count(),
            'review_projects' => $allProjectsForMetrics->where('status', 'review')->count(),
            'done_projects' => $allProjectsForMetrics->where('status', 'done')->count(),
            'urgent_projects' => $allProjectsForMetrics->filter(function (Project $p) use ($today): bool {
                return ! in_array($p->status, ['done', 'survey'], true) && $p->due_date && $p->due_date->diffInDays($today, false) <= 0 && $today->diffInDays($p->due_date, false) <= 7;
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
                if ($p->status === 'survey') {
                    $phase = 'Tahap Survey';
                } elseif ($p->status === 'done') {
                    $phase = 'Selesai';
                } elseif ($p->status === 'review' && ! $activeStage) {
                    $phase = 'Asistensi';
                }

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'client_name' => $p->client_name,
                    'client_phone' => $p->client_phone,
                    'location' => $p->cleanLocation(),
                    'maps_url' => $p->maps_url,
                    'category' => $p->package_name ?: ($p->category ?: 'Paket 1'),
                    'package_name' => $p->package_name ?: ($p->category ?: 'Paket 1'),
                    'project_type' => $p->project_type ?? 'perencanaan',
                    'building_type' => $p->resolvedBuildingType(),
                    'package_addons' => $p->package_addons ?? [],
                    'building_area' => $p->building_area,
                    'estimated_budget' => $p->estimated_budget,
                    'custom_scope_notes' => $p->custom_scope_notes,
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

        $categories = collect(ProjectPackageService::packages())->pluck('id')->all();

        $timelineQuery = Project::query()
            ->with([
                'members:id,name',
                'stages' => fn ($q) => $q->orderBy('order'),
            ])
            ->whereIn('project_type', $sectionTypes)
            ->whereIn('status', ['planning', 'ongoing', 'review'])
            ->orderBy('start_date');

        if (! $isAdmin) {
            $timelineQuery->where(function ($q) use ($user): void {
                $q->where('owner_id', $user->id)
                    ->orWhereHas('members', fn ($mq) => $mq->where('users.id', $user->id));
            });
        }

        $timelineProjects = $timelineQuery
            ->get()
            ->map(function (Project $p): array {
                $lead = $p->members->first(fn (User $u) => str_contains(strtolower((string) ($u->pivot->role_in_project ?? '')), 'lead'))
                    ?? $p->members->first();
                $activeStage = $p->stages->firstWhere('status', 'active') ?? $p->stages->first();

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'client_name' => $p->client_name,
                    'pic' => $lead ? explode(' ', trim($lead->name))[0] : '-',
                    'active_stage' => $activeStage?->name ?? 'Perencanaan',
                    'status' => $p->status,
                    'start_date' => $p->start_date?->format('Y-m-d'),
                    'due_date' => $p->due_date?->format('Y-m-d'),
                    'stages' => $p->stages->map(fn (ProjectStage $s) => [
                        'id' => $s->id,
                        'name' => $s->name,
                        'status' => $s->status,
                        'update_design_date' => $s->update_design_date?->format('Y-m-d'),
                        'client_response_date' => $s->client_response_date?->format('Y-m-d'),
                    ])->values(),
                ];
            })
            ->values();

        return Inertia::render('Projects/Index', [
            'section' => $section,
            'projects' => $projects,
            'metrics' => $metrics,
            'filters' => [
                'search' => $search,
                'category' => $category,
                'status' => $status,
                'type' => $projectType,
                'tab' => $tab,
            ],
            'projectTypes' => Project::TYPES,
            'categories' => $categories,
            'packages' => ProjectPackageService::packages(),
            'addons' => ProjectPackageService::addons(),
            'teamMembers' => $teamMembers,
            'timelineProjects' => $timelineProjects,
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
            'category' => ['nullable', 'string', 'max:100'],
            'package_name' => ['nullable', 'string', 'max:100'],
            'project_type' => ['nullable', Rule::in(array_keys(Project::TYPES))],
            'building_type' => ['nullable', Rule::in(array_keys(Project::BUILDING_TYPES))],
            'package_addons' => ['nullable', 'array'],
            'package_addons.*' => ['string', 'max:150'],
            'building_area' => ['nullable', 'numeric', 'min:0'],
            'estimated_budget' => ['nullable', 'integer', 'min:0'],
            'custom_scope_notes' => ['nullable', 'string', 'max:2000'],
            'cover_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'cover_image_url' => ['nullable', 'string', 'max:500'],
            'drive_url' => ['nullable', 'url', 'max:500'],
            'description' => ['nullable', 'string', 'max:2000'],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['required', Rule::in(['survey', 'planning', 'ongoing', 'review', 'done', 'on_hold'])],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => ['exists:users,id'],
            'lead_id' => ['nullable', 'exists:users,id'],
            'stages' => ['nullable', 'array'],
            'stages.*' => ['string', 'max:100'],
        ]);

        $packageName = ! empty($validated['package_name'])
            ? $validated['package_name']
            : (! empty($validated['category']) ? $validated['category'] : 'Paket 1');

        $startDate = ! empty($validated['start_date'])
            ? Carbon::parse($validated['start_date'])
            : Carbon::today();

        // Build stage list with official RIM Projects timeline dates
        $stageNames = ! empty($validated['stages'])
            ? array_filter($validated['stages'])
            : collect(ProjectPackageService::packages())
                ->firstWhere('id', $packageName)['default_stages']
                ?? ['Tahap Konseptual V1', 'Tahap Konseptual V2', 'Tahap Pengembangan V1', 'Tahap Pengembangan V2'];

        $builtStages = ProjectPackageService::buildStagesWithTimeline($startDate, array_values($stageNames));
        $lastStageDate = ! empty($builtStages)
            ? end($builtStages)['client_response_date']
            : null;

        $coverImageUrl = ! empty($validated['cover_image_url']) ? $validated['cover_image_url'] : '/project-covers/rumah-tropis.png';
        if ($request->hasFile('cover_image')) {
            $dir = public_path('uploads/project-covers');
            File::ensureDirectoryExists($dir);
            $file = $request->file('cover_image');
            $filename = 'cover-'.Str::random(12).'.'.($file->guessExtension() ?: 'jpg');
            $file->move($dir, $filename);
            $coverImageUrl = "/uploads/project-covers/{$filename}";
        }

        $buildingType = str_contains(strtolower($packageName), 'interior')
            ? 'interior'
            : ($validated['building_type'] ?? 'rumah_hunian');

        $project = Project::query()->create([
            'name' => $validated['name'],
            'client_name' => $validated['client_name'],
            'client_phone' => $validated['client_phone'] ?? null,
            'location' => $validated['location'] ?? null,
            'category' => $packageName,
            'package_name' => $packageName,
            'project_type' => $validated['project_type'] ?? 'perencanaan',
            'building_type' => $buildingType,
            'package_addons' => $validated['package_addons'] ?? [],
            'building_area' => $validated['building_area'] ?? null,
            'estimated_budget' => $validated['estimated_budget'] ?? null,
            'custom_scope_notes' => $validated['custom_scope_notes'] ?? null,
            'cover_image_url' => $coverImageUrl,
            'drive_url' => $validated['drive_url'] ?? null,
            'description' => $validated['description'] ?? null,
            'start_date' => $startDate->format('Y-m-d'),
            'due_date' => $validated['due_date'] ?? $lastStageDate,
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

        // Create stages with calculated timeline
        foreach ($builtStages as $stageData) {
            $project->stages()->create($stageData);
        }

        ActivityLog::record(
            action: 'project.created',
            description: "{$user->name} membuat proyek baru: {$project->name} ({$packageName})",
            reference: $project,
            user: $user,
        );

        return redirect()->route('projects.show', $project->id)
            ->with('success', "Proyek '{$project->name}' berhasil dibuat dengan timeline {$packageName}.");
    }

    /**
     * Display a specific project with Notion-style Kanban board and details (/projects/{project}).
     */
    public function show(Request $request, Project $project): Response
    {
        if (! $project->isAccessibleBy($request->user())) {
            abort(403);
        }

        $today = Carbon::today();

        $project->load([
            'owner:id,name,email',
            'members.employee',
            'stages' => fn ($q) => $q->orderBy('order'),
            'tasks.assignee.employee',
            'tasks.stage',
            'tasks.dailyTasks' => fn ($q) => $q->with('user:id,name')->latest('work_date')->latest('id'),
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
                'category' => $project->package_name ?: ($project->category ?: 'Paket 1'),
                'package_name' => $project->package_name ?: ($project->category ?: 'Paket 1'),
                'project_type' => $project->project_type ?? 'perencanaan',
                'building_type' => $project->resolvedBuildingType(),
                'package_addons' => $project->package_addons ?? [],
                'building_area' => $project->building_area,
                'estimated_budget' => $project->estimated_budget,
                'custom_scope_notes' => $project->custom_scope_notes,
                'cover_image_url' => $project->cover_image_url ?: '/project-covers/rumah-tropis.png',
                'drive_url' => $project->drive_url,
                'description' => $project->description,
                'status' => $project->status,
                'progress_percent' => $project->progress_percent,
                'start_date' => $project->start_date?->format('Y-m-d'),
                'start_date_formatted' => $project->start_date?->translatedFormat('d F Y'),
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
                    'update_design_date' => $s->update_design_date?->format('Y-m-d'),
                    'update_design_date_formatted' => $s->update_design_date?->translatedFormat('d-F-Y'),
                    'client_response_date' => $s->client_response_date?->format('Y-m-d'),
                    'client_response_date_formatted' => $s->client_response_date?->translatedFormat('d-F-Y'),
                    'output_notes' => $s->output_notes,
                    'duration_workdays' => $s->duration_workdays,
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
            'packages' => ProjectPackageService::packages(),
            'addons' => ProjectPackageService::addons(),
            'clientBrief' => (function () use ($project): array {
                $brief = ProjectClientBrief::forProject($project);

                return [
                    'status' => $brief->status,
                    'building_type' => $project->resolvedBuildingType(),
                    'template_title' => ClientBriefTemplate::templateLabels()[$project->resolvedBuildingType()] ?? 'Formulir Informasi Klien',
                    'public_url' => route('brief.show', $brief->token),
                    'print_url' => route('projects.brief.print', $project->id),
                    'compass_options' => ClientBriefTemplate::compassOptions(),
                    'fields' => $brief->fields ?? [],
                    'responses' => (object) ($brief->responses ?? []),
                    'sent_at' => $brief->sent_at?->translatedFormat('d M Y, H:i'),
                    'submitted_at' => $brief->submitted_at?->translatedFormat('d M Y, H:i'),
                    'field_types' => ClientBriefTemplate::fieldTypes(),
                ];
            })(),
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
            'category' => ['nullable', 'string', 'max:100'],
            'package_name' => ['nullable', 'string', 'max:100'],
            'project_type' => ['nullable', Rule::in(array_keys(Project::TYPES))],
            'building_type' => ['nullable', Rule::in(array_keys(Project::BUILDING_TYPES))],
            'package_addons' => ['nullable', 'array'],
            'package_addons.*' => ['string', 'max:150'],
            'building_area' => ['nullable', 'numeric', 'min:0'],
            'estimated_budget' => ['nullable', 'integer', 'min:0'],
            'custom_scope_notes' => ['nullable', 'string', 'max:2000'],
            'cover_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'cover_image_url' => ['nullable', 'string', 'max:500'],
            'drive_url' => ['nullable', 'url', 'max:500'],
            'description' => ['nullable', 'string', 'max:2000'],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['required', Rule::in(['survey', 'planning', 'ongoing', 'review', 'done', 'on_hold'])],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => ['exists:users,id'],
            'lead_id' => ['nullable', 'exists:users,id'],
        ]);

        $packageName = ! empty($validated['package_name'])
            ? $validated['package_name']
            : (! empty($validated['category']) ? $validated['category'] : ($project->package_name ?: 'Paket 1'));

        $coverImageUrl = $validated['cover_image_url'] ?? $project->cover_image_url;
        if ($request->hasFile('cover_image')) {
            $dir = public_path('uploads/project-covers');
            File::ensureDirectoryExists($dir);
            $file = $request->file('cover_image');
            $filename = 'cover-'.Str::random(12).'.'.($file->guessExtension() ?: 'jpg');
            $file->move($dir, $filename);
            $coverImageUrl = "/uploads/project-covers/{$filename}";
        }

        $oldBuildingType = $project->resolvedBuildingType();
        $buildingType = str_contains(strtolower($packageName), 'interior')
            ? 'interior'
            : ($validated['building_type'] ?? $project->building_type ?? 'rumah_hunian');

        $project->update([
            'name' => $validated['name'],
            'client_name' => $validated['client_name'],
            'client_phone' => $validated['client_phone'] ?? null,
            'location' => $validated['location'] ?? null,
            'category' => $packageName,
            'package_name' => $packageName,
            'project_type' => $validated['project_type'] ?? $project->project_type ?? 'perencanaan',
            'building_type' => $buildingType,
            'package_addons' => $validated['package_addons'] ?? $project->package_addons ?? [],
            'building_area' => array_key_exists('building_area', $validated) ? $validated['building_area'] : $project->building_area,
            'estimated_budget' => array_key_exists('estimated_budget', $validated) ? $validated['estimated_budget'] : $project->estimated_budget,
            'custom_scope_notes' => array_key_exists('custom_scope_notes', $validated) ? $validated['custom_scope_notes'] : $project->custom_scope_notes,
            'cover_image_url' => $coverImageUrl,
            'drive_url' => $validated['drive_url'] ?? null,
            'description' => $validated['description'] ?? null,
            'start_date' => $validated['start_date'] ?? $project->start_date,
            'due_date' => $validated['due_date'] ?? null,
            'status' => $validated['status'],
        ]);

        if ($oldBuildingType !== $buildingType) {
            $brief = $project->clientBrief;
            if ($brief && $brief->status === 'draft' && empty($brief->responses)) {
                $brief->update([
                    'fields' => ClientBriefTemplate::forBuildingType($buildingType),
                ]);
            }
        }

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
            'status' => ['nullable', Rule::in(['pending', 'active', 'completed'])],
            'update_design_date' => ['nullable', 'date'],
            'client_response_date' => ['nullable', 'date'],
            'output_notes' => ['nullable', 'string', 'max:2000'],
            'duration_workdays' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        $maxOrder = (int) $project->stages()->max('order');

        $updateDesignDate = $validated['update_design_date'] ?? null;
        $clientResponseDate = $validated['client_response_date']
            ?? ($updateDesignDate ? Carbon::parse($updateDesignDate)->addDays(3)->format('Y-m-d') : null);

        $stage = $project->stages()->create([
            'name' => $validated['name'],
            'order' => $maxOrder + 1,
            'status' => $validated['status'] ?? 'pending',
            'update_design_date' => $updateDesignDate,
            'client_response_date' => $clientResponseDate,
            'output_notes' => $validated['output_notes'] ?? null,
            'duration_workdays' => $validated['duration_workdays'] ?? null,
        ]);

        ActivityLog::record(
            action: 'project.stage_created',
            description: "{$request->user()->name} menambahkan tahapan '{$stage->name}' pada {$project->name}",
            reference: $project,
            user: $request->user(),
        );

        return redirect()->back()->with('success', "Tahapan '{$validated['name']}' berhasil ditambahkan ke timeline.");
    }

    /**
     * Update a stage & its timeline (/projects/{project}/stages/{stage}).
     */
    public function updateStage(Request $request, Project $project, ProjectStage $stage): RedirectResponse
    {
        if ($stage->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'status' => ['required', Rule::in(['pending', 'active', 'completed'])],
            'update_design_date' => ['nullable', 'date'],
            'client_response_date' => ['nullable', 'date'],
            'output_notes' => ['nullable', 'string', 'max:2000'],
            'duration_workdays' => ['nullable', 'integer', 'min:1', 'max:365'],
            'order' => ['nullable', 'integer', 'min:1'],
        ]);

        $updateDesignDate = $validated['update_design_date'] ?? null;
        $clientResponseDate = $validated['client_response_date']
            ?? ($updateDesignDate ? Carbon::parse($updateDesignDate)->addDays(3)->format('Y-m-d') : null);

        $stage->update([
            'name' => $validated['name'],
            'status' => $validated['status'],
            'update_design_date' => $updateDesignDate,
            'client_response_date' => $clientResponseDate,
            'output_notes' => $validated['output_notes'] ?? null,
            'duration_workdays' => $validated['duration_workdays'] ?? $stage->duration_workdays,
            'order' => $validated['order'] ?? $stage->order,
        ]);

        ActivityLog::record(
            action: 'project.stage_updated',
            description: "{$request->user()->name} memperbarui jadwal tahapan '{$stage->name}' pada {$project->name}",
            reference: $project,
            user: $request->user(),
        );

        return redirect()->back()->with('success', "Timeline tahapan '{$stage->name}' berhasil diperbarui.");
    }

    /**
     * Reorder project stages (/projects/{project}/stages/reorder).
     */
    public function reorderStages(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'stage_ids' => ['required', 'array', 'min:1'],
            'stage_ids.*' => ['integer', 'exists:project_stages,id'],
        ]);

        foreach (array_values($validated['stage_ids']) as $index => $stageId) {
            $project->stages()
                ->where('id', $stageId)
                ->update(['order' => $index + 1]);
        }

        return redirect()->back()->with('success', 'Urutan tahapan timeline berhasil diperbarui.');
    }

    /**
     * Printable & downloadable official RIM Projects timeline document (/projects/{project}/timeline/print).
     */
    public function printTimeline(Request $request, Project $project): View|HttpResponse
    {
        if (! $project->isAccessibleBy($request->user())) {
            abort(403);
        }

        $project->load(['stages' => fn ($q) => $q->orderBy('order')]);
        $office = OfficeSetting::current();

        $logoRel = $office->company_logo_url ?: '/rim-projects-logo.png';
        $logoPath = public_path(ltrim($logoRel, '/'));
        $logoDataUri = is_file($logoPath)
            ? 'data:'.(mime_content_type($logoPath) ?: 'image/png').';base64,'.base64_encode((string) file_get_contents($logoPath))
            : null;

        $stageTemplates = ProjectPackageService::stageTemplates();
        $stagesWithMeta = [];
        $outputRows = [];

        foreach ($project->stages as $stage) {
            $tpl = $stageTemplates[$stage->name] ?? null;
            $outputText = trim((string) ($stage->output_notes ?: ($tpl['output'] ?? '')));
            $workdays = $stage->duration_workdays ?: ($tpl['workdays'] ?? null);

            $stagesWithMeta[] = [
                'stage' => $stage,
                'workdays' => $workdays,
            ];

            if ($outputText !== '') {
                $outputRows[] = [
                    'name' => $stage->name,
                    'output' => $outputText,
                ];
            }
        }

        $viewData = [
            'project' => $project,
            'office' => $office,
            'logoDataUri' => $logoDataUri,
            'stagesWithMeta' => $stagesWithMeta,
            'outputRows' => $outputRows,
        ];

        if ($request->boolean('download')) {
            $slugName = Str::slug($project->name) ?: 'proyek';
            $filename = "Timeline-Pekerjaan-{$slugName}.pdf";

            return Pdf::loadView('projects.timeline-pdf', $viewData)
                ->setPaper('a4', 'portrait')
                ->download($filename);
        }

        return view('projects.timeline-print', $viewData);
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
            'daily_tasks_count' => $t->relationLoaded('dailyTasks') ? $t->dailyTasks->count() : 0,
            'daily_tasks' => $t->relationLoaded('dailyTasks')
                ? $t->dailyTasks->take(10)->map(fn (DailyTask $dt): array => [
                    'id' => $dt->id,
                    'title' => $dt->title,
                    'status' => $dt->status,
                    'notes' => $dt->notes,
                    'work_date' => $dt->work_date->format('Y-m-d'),
                    'work_date_formatted' => $dt->work_date->translatedFormat('d M'),
                    'user_name' => $dt->user?->name ?? 'Tim Studio',
                ])->values()->all()
                : [],
        ];
    }
}
