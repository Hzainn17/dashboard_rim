<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\Project;
use App\Models\ProjectUpdate;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FieldProjectController extends Controller
{
    /**
     * Display the lightweight Field Projects page (/field-projects) dedicated to construction sites & Site Visit attendance.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if (! $user->isAdmin() && ! $user->isFieldWorker()) {
            return redirect()->route('projects.index');
        }

        $isAdmin = $user->isAdmin();
        $search = $request->string('search')->trim()->value();
        $status = $request->string('status')->trim()->value();

        $query = Project::query()
            ->whereIn('project_type', Project::FIELD_TYPES)
            ->with(['members.employee']);

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

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        } else {
            $query->where('status', '!=', 'survey');
        }

        $projects = $query->orderByDesc('updated_at')->get();
        $projectIds = $projects->pluck('id');

        $siteVisitCounts = Attendance::query()
            ->whereIn('site_visit_project_id', $projectIds)
            ->selectRaw('site_visit_project_id, count(*) as total')
            ->groupBy('site_visit_project_id')
            ->pluck('total', 'site_visit_project_id');

        $todaySiteVisits = Attendance::query()
            ->whereDate('date', Carbon::today())
            ->whereIn('site_visit_project_id', $projectIds)
            ->count();

        $formattedProjects = $projects->map(function (Project $p) use ($siteVisitCounts): array {
            $normalizedLoc = Project::normalizeLocationAndMaps($p->location, $p->maps_url);

            return [
                'id' => $p->id,
                'name' => $p->name,
                'client_name' => $p->client_name,
                'client_phone' => $p->client_phone,
                'location' => $normalizedLoc['location'],
                'maps_url' => $normalizedLoc['maps_url'],
                'google_maps_url' => $p->googleMapsUrl(),
                'project_type' => $p->project_type ?? 'pembangunan',
                'status' => $p->status,
                'cover_image_url' => $p->cover_image_url,
                'description' => $p->description,
                'start_date' => $p->start_date?->format('Y-m-d'),
                'due_date' => $p->due_date?->format('Y-m-d'),
                'due_date_formatted' => $p->due_date?->translatedFormat('d M Y'),
                'site_visit_count' => (int) ($siteVisitCounts[$p->id] ?? 0),
                'members' => $p->members->map(fn (User $m): array => [
                    'id' => $m->id,
                    'name' => $m->name,
                    'photo_url' => $m->photo_url,
                    'role_in_project' => $m->pivot->role_in_project ?? 'Tim Lapangan',
                ])->values()->all(),
            ];
        })->values();

        $allFieldProjects = Project::query()
            ->whereIn('project_type', Project::FIELD_TYPES)
            ->when(! $isAdmin, function ($q) use ($user): void {
                $q->where(function ($sub) use ($user): void {
                    $sub->where('owner_id', $user->id)
                        ->orWhereHas('members', fn ($mq) => $mq->where('users.id', $user->id));
                });
            })
            ->get(['id', 'status']);

        $teamMembers = User::query()
            ->with('employee')
            ->where('is_active', true)
            ->orderByRaw("CASE WHEN EXISTS (SELECT 1 FROM employees WHERE employees.user_id = users.id AND employees.work_type = 'lapangan') THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get()
            ->map(fn (User $u): array => [
                'id' => $u->id,
                'name' => $u->name,
                'position' => $u->employee?->position ?? 'Staf',
                'work_type' => $u->employee?->work_type ?? 'kantor',
            ])
            ->values();

        return Inertia::render('FieldProjects/Index', [
            'section' => 'field',
            'projects' => $formattedProjects,
            'metrics' => [
                'active_projects' => $allFieldProjects->whereIn('status', ['planning', 'ongoing', 'review'])->count(),
                'retention_projects' => $allFieldProjects->where('status', 'retention')->count(),
                'today_site_visits' => $todaySiteVisits,
                'done_projects' => $allFieldProjects->where('status', 'done')->count(),
            ],
            'teamMembers' => $teamMembers,
            'filters' => [
                'search' => $search,
                'status' => $status ?: 'all',
            ],
        ]);
    }

    /**
     * Store a new Field / Construction Project quickly so field staff can select it for Site Visit attendance.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (! $user->isAdmin()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'client_name' => ['required', 'string', 'max:150'],
            'client_phone' => ['nullable', 'string', 'max:25'],
            'location' => ['required', 'string', 'max:500'],
            'maps_url' => ['nullable', 'url', 'max:500'],
            'project_type' => ['required', Rule::in(['pembangunan', 'desain_bangun'])],
            'status' => ['required', Rule::in(['planning', 'ongoing', 'review', 'retention', 'done', 'on_hold'])],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'description' => ['nullable', 'string', 'max:1000'],
            'cover_image' => ['nullable', 'image', 'max:5120'],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => ['exists:users,id'],
        ]);

        $normalizedLoc = Project::normalizeLocationAndMaps(
            $validated['location'],
            $validated['maps_url'] ?? null,
        );

        $coverUrl = null;
        if ($request->hasFile('cover_image')) {
            $dir = public_path('uploads/projects');
            if (! File::isDirectory($dir)) {
                File::makeDirectory($dir, 0755, true);
            }
            $file = $request->file('cover_image');
            $ext = $file->guessExtension() ?: 'jpg';
            $filename = 'field_project_'.time().'_'.uniqid().'.'.$ext;
            $file->move($dir, $filename);
            $coverUrl = "/uploads/projects/{$filename}";
        }

        $project = Project::query()->create([
            'name' => $validated['name'],
            'client_name' => $validated['client_name'],
            'client_phone' => $validated['client_phone'] ?? null,
            'location' => $normalizedLoc['location'],
            'maps_url' => $normalizedLoc['maps_url'],
            'category' => 'Konstruksi',
            'project_type' => $validated['project_type'],
            'building_type' => 'rumah_hunian',
            'status' => $validated['status'],
            'start_date' => $validated['start_date'] ?? now()->format('Y-m-d'),
            'due_date' => $validated['due_date'] ?? null,
            'description' => $validated['description'] ?? null,
            'cover_image_url' => $coverUrl,
            'owner_id' => $user->id,
        ]);

        $memberIds = collect($validated['member_ids'] ?? [])->map(fn ($id) => (int) $id)->unique();
        $syncPayload = [];
        foreach ($memberIds as $idx => $mid) {
            $syncPayload[$mid] = ['role_in_project' => $idx === 0 ? 'Lead Lapangan' : 'Tim Lapangan'];
        }
        if (! empty($syncPayload)) {
            $project->members()->sync($syncPayload);
        }

        ActivityLog::record(
            action: 'field_project.created',
            description: "{$user->name} menambahkan proyek lapangan '{$project->name}'",
            reference: $project,
            user: $user,
        );

        return redirect()
            ->route('projects.field')
            ->with('success', "Proyek lapangan '{$project->name}' berhasil ditambahkan dan siap dipilih untuk Absen Site Visit.");
    }

    /**
     * Update basic details & assigned team of a Field Project.
     */
    public function update(Request $request, Project $project): RedirectResponse
    {
        $user = $request->user();
        if (! $user->isAdmin()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'client_name' => ['required', 'string', 'max:150'],
            'client_phone' => ['nullable', 'string', 'max:25'],
            'location' => ['required', 'string', 'max:500'],
            'maps_url' => ['nullable', 'url', 'max:500'],
            'project_type' => ['required', Rule::in(['pembangunan', 'desain_bangun'])],
            'status' => ['required', Rule::in(['planning', 'ongoing', 'review', 'retention', 'done', 'on_hold'])],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'description' => ['nullable', 'string', 'max:1000'],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => ['exists:users,id'],
        ]);

        $normalizedLoc = Project::normalizeLocationAndMaps(
            $validated['location'],
            $validated['maps_url'] ?? null,
        );

        $project->update([
            'name' => $validated['name'],
            'client_name' => $validated['client_name'],
            'client_phone' => $validated['client_phone'] ?? null,
            'location' => $normalizedLoc['location'],
            'maps_url' => $normalizedLoc['maps_url'],
            'project_type' => $validated['project_type'],
            'status' => $validated['status'],
            'start_date' => $validated['start_date'] ?? $project->start_date,
            'due_date' => $validated['due_date'] ?? null,
            'description' => $validated['description'] ?? null,
        ]);

        if (array_key_exists('member_ids', $validated)) {
            $memberIds = collect($validated['member_ids'] ?? [])->map(fn ($id) => (int) $id)->unique();
            $syncPayload = [];
            foreach ($memberIds as $idx => $mid) {
                $syncPayload[$mid] = ['role_in_project' => $idx === 0 ? 'Lead Lapangan' : 'Tim Lapangan'];
            }
            $project->members()->sync($syncPayload);
        }

        return redirect()->back()->with('success', "Data proyek lapangan '{$project->name}' berhasil diperbarui.");
    }

    /**
     * Delete a Field Project and return to /field-projects.
     */
    public function destroy(Request $request, Project $project): RedirectResponse
    {
        $user = $request->user();
        if (! $user->isAdmin()) {
            abort(403);
        }

        $name = $project->name;
        $project->delete();

        ActivityLog::record(
            action: 'field_project.deleted',
            description: "{$user->name} menghapus proyek lapangan '{$name}'",
            user: $user,
        );

        return redirect()
            ->route('projects.field')
            ->with('success', "Proyek lapangan '{$name}' telah dihapus.");
    }

    /**
     * Display simple Field Project detail: Location, Field Team, Site Visit Attendance History & Field Notes.
     */
    public function show(Request $request, Project $project): Response|RedirectResponse
    {
        $user = $request->user();

        if (! $project->isAccessibleBy($user)) {
            abort(403);
        }

        if (! $project->hasFieldSite()) {
            return redirect()->route('projects.show', $project->id);
        }

        $project->load(['members.employee', 'updates.user']);

        $siteVisits = Attendance::query()
            ->with('user.employee')
            ->where('site_visit_project_id', $project->id)
            ->orderByDesc('date')
            ->orderByDesc('check_in_at')
            ->take(40)
            ->get()
            ->map(fn (Attendance $att): array => [
                'id' => $att->id,
                'date' => $att->date->translatedFormat('d M Y'),
                'user_name' => $att->user?->name ?? 'Tim Lapangan',
                'position' => $att->user?->employee?->position ?? 'Pengawas',
                'check_in_time' => $att->check_in_at?->format('H:i'),
                'check_out_time' => $att->check_out_at?->format('H:i'),
                'photo_url' => $att->site_visit_photo_url,
                'site_visit_status' => $att->site_visit_status,
                'notes' => $att->notes,
            ])
            ->values();

        $teamMembers = User::query()
            ->with('employee')
            ->where('is_active', true)
            ->orderByRaw("CASE WHEN EXISTS (SELECT 1 FROM employees WHERE employees.user_id = users.id AND employees.work_type = 'lapangan') THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get()
            ->map(fn (User $u): array => [
                'id' => $u->id,
                'name' => $u->name,
                'position' => $u->employee?->position ?? 'Staf',
                'work_type' => $u->employee?->work_type ?? 'kantor',
            ])
            ->values();

        $normalizedLoc = Project::normalizeLocationAndMaps($project->location, $project->maps_url);

        return Inertia::render('FieldProjects/Show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'client_name' => $project->client_name,
                'client_phone' => $project->client_phone,
                'location' => $normalizedLoc['location'],
                'maps_url' => $normalizedLoc['maps_url'],
                'google_maps_url' => $project->googleMapsUrl(),
                'embed_maps_url' => $project->embedMapsUrl(),
                'project_type' => $project->project_type ?? 'pembangunan',
                'status' => $project->status,
                'start_date' => $project->start_date?->format('Y-m-d'),
                'start_date_formatted' => $project->start_date?->translatedFormat('d M Y'),
                'due_date' => $project->due_date?->format('Y-m-d'),
                'due_date_formatted' => $project->due_date?->translatedFormat('d M Y'),
                'description' => $project->description,
                'member_ids' => $project->members->pluck('id')->values()->all(),
                'members' => $project->members->map(fn (User $m): array => [
                    'id' => $m->id,
                    'name' => $m->name,
                    'photo_url' => $m->photo_url,
                    'position' => $m->employee?->position ?? 'Tim Lapangan',
                    'role_in_project' => $m->pivot->role_in_project ?? 'Tim Lapangan',
                ])->values()->all(),
            ],
            'siteVisits' => $siteVisits,
            'updates' => $project->updates->take(20)->map(fn (ProjectUpdate $u): array => [
                'id' => $u->id,
                'content' => $u->content,
                'author_name' => $u->user?->name ?? 'Tim',
                'created_at' => $u->created_at?->translatedFormat('d M Y, H:i'),
            ])->values()->all(),
            'teamMembers' => $teamMembers,
        ]);
    }
}
