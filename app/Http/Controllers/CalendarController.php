<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\CalendarEvent;
use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    /**
     * Build unified calendar events from manual events, project deadlines, and site visits.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public static function getUnifiedEvents(Carbon $rangeStart, Carbon $rangeEnd, string $filterType = 'all'): Collection
    {
        $calendarEvents = CalendarEvent::query()
            ->with(['creator:id,name', 'project:id,name', 'participants.employee'])
            ->where(function ($q) use ($rangeStart, $rangeEnd): void {
                $q->whereBetween('start_at', [$rangeStart, $rangeEnd])
                    ->orWhereBetween('end_at', [$rangeStart, $rangeEnd]);
            })
            ->orderBy('start_at')
            ->get()
            ->map(fn (CalendarEvent $e) => [
                'id' => "event_{$e->id}",
                'raw_id' => $e->id,
                'title' => $e->title,
                'description' => $e->description,
                'checklist_items' => $e->checklist_items ?? [],
                'is_completed' => (bool) $e->is_completed,
                'location' => $e->location,
                'type' => $e->type,
                'start_at' => $e->start_at->toIso8601String(),
                'end_at' => $e->end_at->toIso8601String(),
                'date' => $e->start_at->format('Y-m-d'),
                'time' => $e->is_all_day ? 'Sepanjang Hari' : $e->start_at->format('H:i'),
                'end_time' => $e->is_all_day ? null : $e->end_at->format('H:i'),
                'is_all_day' => (bool) $e->is_all_day,
                'is_virtual' => false,
                'project_id' => $e->project_id,
                'project_name' => $e->project?->name,
                'creator_name' => $e->creator?->name ?? 'Admin',
                'participants' => $e->participants->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'position' => $u->employee?->position ?? 'Arsitek',
                    'photo_url' => $u->photo_url,
                ])->values()->all(),
            ]);

        // Integrate project deadlines automatically (exclude pre-dealing survey projects)
        $projectDeadlines = Project::query()
            ->with('members.employee')
            ->where('status', '!=', 'survey')
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$rangeStart->toDateString(), $rangeEnd->toDateString()])
            ->get()
            ->map(fn (Project $p) => [
                'id' => "proj_deadline_{$p->id}",
                'raw_id' => $p->id,
                'title' => "Deadline Proyek: {$p->name}",
                'description' => "Target serah terima / deadline proyek {$p->name} ({$p->client_name})",
                'location' => $p->location ?: 'Studio RIM',
                'type' => 'deadline',
                'start_at' => $p->due_date->copy()->setTime(17, 0)->toIso8601String(),
                'end_at' => $p->due_date->copy()->setTime(17, 0)->toIso8601String(),
                'date' => $p->due_date->format('Y-m-d'),
                'time' => '17:00',
                'end_time' => null,
                'is_all_day' => false,
                'is_virtual' => true,
                'project_id' => $p->id,
                'project_name' => $p->name,
                'creator_name' => 'Sistem Studio RIM',
                'participants' => $p->members->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'position' => $u->employee?->position ?? 'Arsitek',
                    'photo_url' => $u->photo_url,
                ])->values()->all(),
            ]);

        // Integrate Site Visit attendance ONLY for office staff (exclude routine daily field workers)
        $siteVisits = Attendance::query()
            ->with(['user.employee', 'siteVisitProject:id,name,location'])
            ->where('mode', 'site_visit')
            ->whereHas('user', fn ($uq) => $uq->whereDoesntHave('employee', fn ($eq) => $eq->where('work_type', 'lapangan')))
            ->whereBetween('date', [$rangeStart->toDateString(), $rangeEnd->toDateString()])
            ->get()
            ->map(fn (Attendance $att) => [
                'id' => "site_visit_{$att->id}",
                'raw_id' => $att->id,
                'title' => 'Site Visit: '.($att->siteVisitProject?->name ?? 'Proyek Lapangan'),
                'description' => "Kunjungan lapangan oleh {$att->user?->name}. Catatan: {$att->notes}",
                'location' => $att->siteVisitProject?->location ?: 'Lokasi Proyek',
                'type' => 'site_visit',
                'start_at' => ($att->check_in_at ?: $att->date->copy()->setTime(9, 0))->toIso8601String(),
                'end_at' => ($att->check_out_at ?: $att->date->copy()->setTime(17, 0))->toIso8601String(),
                'date' => $att->date->format('Y-m-d'),
                'time' => $att->check_in_at ? $att->check_in_at->format('H:i') : '09:00',
                'end_time' => $att->check_out_at ? $att->check_out_at->format('H:i') : null,
                'is_all_day' => false,
                'is_virtual' => true,
                'project_id' => $att->site_visit_project_id,
                'project_name' => $att->siteVisitProject?->name,
                'creator_name' => $att->user?->name ?? 'Arsitek',
                'participants' => [[
                    'id' => $att->user_id,
                    'name' => $att->user?->name ?? 'Arsitek',
                    'position' => $att->user?->employee?->position ?? 'Arsitek',
                    'photo_url' => $att->user?->photo_url,
                ]],
            ]);

        // Integrate Project Stage design deadlines automatically (exclude pre-dealing survey projects)
        $stageDeadlines = ProjectStage::query()
            ->with(['project.members.employee'])
            ->whereHas('project', fn ($q) => $q->where('status', '!=', 'survey'))
            ->where(function ($q) use ($rangeStart, $rangeEnd): void {
                $q->whereBetween('update_design_date', [$rangeStart->toDateString(), $rangeEnd->toDateString()])
                    ->orWhereBetween('client_response_date', [$rangeStart->toDateString(), $rangeEnd->toDateString()]);
            })
            ->get()
            ->flatMap(function (ProjectStage $stage) use ($rangeStart, $rangeEnd): array {
                $events = [];
                $project = $stage->project;
                if (! $project) {
                    return [];
                }

                $participants = $project->members->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'position' => $u->employee?->position ?? 'Arsitek',
                    'photo_url' => $u->photo_url,
                ])->values()->all();

                if ($stage->update_design_date && $stage->update_design_date->between($rangeStart->copy()->startOfDay(), $rangeEnd->copy()->endOfDay())) {
                    $events[] = [
                        'id' => "stage_design_{$stage->id}",
                        'raw_id' => $stage->id,
                        'title' => "Update Desain: {$stage->name} ({$project->name})",
                        'description' => "Batas maksimal update desain tahapan {$stage->name} untuk proyek {$project->name}.".($stage->output_notes ? " Output: {$stage->output_notes}" : ''),
                        'location' => $project->location ?: 'Studio RIM',
                        'type' => 'deadline',
                        'start_at' => $stage->update_design_date->copy()->setTime(17, 0)->toIso8601String(),
                        'end_at' => $stage->update_design_date->copy()->setTime(17, 0)->toIso8601String(),
                        'date' => $stage->update_design_date->format('Y-m-d'),
                        'time' => '17:00',
                        'end_time' => null,
                        'is_all_day' => false,
                        'is_virtual' => true,
                        'project_id' => $project->id,
                        'project_name' => $project->name,
                        'creator_name' => 'Timeline Proyek',
                        'participants' => $participants,
                    ];
                }

                if ($stage->client_response_date && $stage->client_response_date->between($rangeStart->copy()->startOfDay(), $rangeEnd->copy()->endOfDay())) {
                    $events[] = [
                        'id' => "stage_client_{$stage->id}",
                        'raw_id' => $stage->id,
                        'title' => "Batas Respon Klien: {$stage->name} ({$project->name})",
                        'description' => "Batas maksimal diskusi & respon klien ({$project->client_name}) untuk tahapan {$stage->name}.",
                        'location' => $project->location ?: 'Asistensi Klien',
                        'type' => 'asistensi',
                        'start_at' => $stage->client_response_date->copy()->setTime(15, 0)->toIso8601String(),
                        'end_at' => $stage->client_response_date->copy()->setTime(16, 0)->toIso8601String(),
                        'date' => $stage->client_response_date->format('Y-m-d'),
                        'time' => '15:00',
                        'end_time' => '16:00',
                        'is_all_day' => false,
                        'is_virtual' => true,
                        'project_id' => $project->id,
                        'project_name' => $project->name,
                        'creator_name' => 'Timeline Proyek',
                        'participants' => $participants,
                    ];
                }

                return $events;
            });

        $allEvents = collect($calendarEvents->all())
            ->concat($projectDeadlines->all())
            ->concat($stageDeadlines->all())
            ->concat($siteVisits->all());

        if ($filterType && $filterType !== 'all') {
            $allEvents = $allEvents->where('type', $filterType);
        }

        return $allEvents->sortBy('start_at')->values();
    }

    /**
     * Display the Studio & Team Calendar page (/calendar).
     */
    public function index(Request $request): Response
    {
        $month = $request->integer('month', (int) now()->month);
        $year = $request->integer('year', (int) now()->year);
        $filterType = $request->input('type', 'all');

        $rangeStart = Carbon::create($year, $month, 1)->startOfMonth();
        $rangeEnd = $rangeStart->copy()->endOfMonth();

        $allEvents = self::getUnifiedEvents($rangeStart, $rangeEnd, $filterType);

        $projects = Project::query()
            ->select(['id', 'name', 'location'])
            ->orderBy('name')
            ->get();

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
                'photo_url' => $u->photo_url,
            ]);

        return Inertia::render('Calendar/Index', [
            'events' => $allEvents,
            'filters' => [
                'month' => $month,
                'year' => $year,
                'type' => $filterType,
            ],
            'currentMonth' => $month,
            'currentYear' => $year,
            'filterType' => $filterType,
            'projects' => $projects,
            'teamMembers' => $teamMembers,
        ]);
    }

    /**
     * Store a newly created calendar event (/calendar/events).
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'checklist_items' => ['nullable', 'array'],
            'checklist_items.*.text' => ['required_with:checklist_items', 'string', 'max:255'],
            'checklist_items.*.done' => ['nullable', 'boolean'],
            'location' => ['nullable', 'string', 'max:255'],
            'type' => ['required', Rule::in(['meeting', 'site_visit', 'field_schedule', 'deadline', 'milestone', 'holiday', 'other'])],
            'start_date' => ['required', 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'is_all_day' => ['nullable', 'boolean'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'participant_ids' => ['nullable', 'array'],
            'participant_ids.*' => ['exists:users,id'],
        ]);

        $checklistItems = collect($validated['checklist_items'] ?? [])
            ->map(fn (array $item): array => [
                'text' => trim($item['text']),
                'done' => (bool) ($item['done'] ?? false),
            ])
            ->filter(fn (array $item): bool => $item['text'] !== '')
            ->values()
            ->all();

        $isAllDay = $request->boolean('is_all_day');
        $startTime = $isAllDay ? '00:00' : (! empty($validated['start_time']) ? $validated['start_time'] : '09:00');
        $endTime = $isAllDay ? '23:59' : (! empty($validated['end_time']) ? $validated['end_time'] : '10:00');

        $startAt = Carbon::parse("{$validated['start_date']} {$startTime}");
        $endAt = Carbon::parse("{$validated['end_date']} {$endTime}");

        $event = CalendarEvent::query()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'checklist_items' => ! empty($checklistItems) ? $checklistItems : null,
            'location' => $validated['location'] ?? null,
            'type' => $validated['type'],
            'start_at' => $startAt,
            'end_at' => $endAt,
            'is_all_day' => $isAllDay,
            'is_completed' => false,
            'created_by' => $user->id,
            'project_id' => $validated['project_id'] ?? null,
        ]);

        if (! empty($validated['participant_ids'])) {
            $event->participants()->attach($validated['participant_ids']);
        }

        $actionName = $validated['type'] === 'field_schedule'
            ? 'field_project.schedule_created'
            : 'calendar.event_created';

        ActivityLog::record(
            action: $actionName,
            description: $validated['type'] === 'field_schedule'
                ? "{$user->name} menjadwalkan agenda lapangan '{$event->title}' ({$startAt->translatedFormat('d M Y')})"
                : "{$user->name} menambahkan agenda '{$event->title}' pada kalender",
            reference: $event,
            user: $user,
        );

        return redirect()->back()->with('success', "Agenda '{$event->title}' berhasil ditambahkan ke kalender.");
    }

    /**
     * Toggle completion or repair checklist items on a calendar event (/calendar/events/{event}/toggle).
     */
    public function toggleFieldSchedule(Request $request, CalendarEvent $event): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'is_completed' => ['sometimes', 'boolean'],
            'checklist_index' => ['sometimes', 'integer', 'min:0'],
        ]);

        $items = $event->checklist_items ?? [];
        $isCompleted = (bool) $event->is_completed;

        if (array_key_exists('checklist_index', $validated)) {
            $idx = (int) $validated['checklist_index'];
            if (isset($items[$idx])) {
                $items[$idx]['done'] = ! (bool) ($items[$idx]['done'] ?? false);
                $isCompleted = count($items) > 0 && collect($items)->every(fn (array $i): bool => (bool) ($i['done'] ?? false));
            }
        } elseif (array_key_exists('is_completed', $validated)) {
            $isCompleted = (bool) $validated['is_completed'];
            if (! empty($items)) {
                $items = collect($items)->map(fn (array $i): array => [
                    ...$i,
                    'done' => $isCompleted,
                ])->all();
            }
        }

        $event->update([
            'checklist_items' => ! empty($items) ? $items : null,
            'is_completed' => $isCompleted,
        ]);

        if ($event->type === 'field_schedule' && $isCompleted) {
            ActivityLog::record(
                action: 'field_project.schedule_completed',
                description: "{$user->name} menandai jadwal lapangan '{$event->title}' selesai",
                reference: $event,
                user: $user,
            );
        }

        return redirect()->back()->with('success', "Status jadwal '{$event->title}' diperbarui.");
    }

    /**
     * Delete a calendar event (/calendar/events/{event}).
     */
    public function destroy(Request $request, CalendarEvent $event): RedirectResponse
    {
        $user = $request->user();
        if (! $user->isAdmin() && $event->created_by !== $user->id) {
            abort(403);
        }

        $title = $event->title;
        $event->delete();

        return redirect()->back()->with('success', "Agenda '{$title}' berhasil dihapus.");
    }
}
