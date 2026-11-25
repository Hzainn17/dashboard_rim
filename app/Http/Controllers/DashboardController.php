<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\DailyTask;
use App\Models\OfficeSetting;
use App\Models\Overtime;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the main studio dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $today = Carbon::today();

        $totalEmployees = User::query()
            ->where('is_active', true)
            ->where('role', '!=', UserRole::SuperAdmin)
            ->count();

        $presentCount = Attendance::query()
            ->whereDate('date', $today)
            ->whereIn('mode', ['office', 'wfh'])
            ->whereIn('status', ['hadir', 'kurang_jam'])
            ->whereHas('user', fn ($q) => $q->where('is_active', true)->where('role', '!=', UserRole::SuperAdmin))
            ->distinct('user_id')
            ->count('user_id');

        $siteVisitCount = Attendance::query()
            ->whereDate('date', $today)
            ->where('mode', 'site_visit')
            ->whereHas('user', fn ($q) => $q->where('is_active', true)->where('role', '!=', UserRole::SuperAdmin))
            ->distinct('user_id')
            ->count('user_id');

        $activeStatuses = ['planning', 'ongoing', 'review'];

        $activeProjectsCount = Project::query()
            ->whereIn('status', $activeStatuses)
            ->count();

        $surveyProjectsCount = Project::query()
            ->where('status', 'survey')
            ->count();

        $urgentProjects = Project::query()
            ->whereIn('status', $activeStatuses)
            ->whereNotNull('due_date')
            ->where('due_date', '<=', Carbon::now()->addDays(7))
            ->orderBy('due_date')
            ->get(['id', 'name']);

        $urgentProjectsCount = $urgentProjects->count();
        $urgentProjectNames = $urgentProjects->take(2)->pluck('name')->implode(' · ');

        $userProjectTypes = $user->isFieldWorker()
            ? Project::FIELD_TYPES
            : ['perencanaan', 'desain_bangun'];

        $myActiveProjects = Project::query()
            ->whereIn('status', $activeStatuses)
            ->when(! $user->isAdmin(), fn ($q) => $q->whereIn('project_type', $userProjectTypes))
            ->where(function ($q) use ($user): void {
                $q->where('owner_id', $user->id)
                    ->orWhereHas('members', fn ($mq) => $mq->where('users.id', $user->id));
            })
            ->orderBy('due_date')
            ->get(['id', 'name']);

        $todayAttendance = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        $myWeekWorkMinutes = (int) Attendance::query()
            ->where('user_id', $user->id)
            ->whereBetween('date', [$today->copy()->startOfWeek(), $today->copy()->endOfWeek()])
            ->sum('actual_work_minutes');

        if ($todayAttendance && $todayAttendance->check_in_at && ! $todayAttendance->check_out_at && $todayAttendance->actual_work_minutes === null) {
            $myWeekWorkMinutes += max(0, (int) $todayAttendance->check_in_at->diffInMinutes(now()));
        }

        $myOvertimeMinutes = (int) Overtime::query()
            ->where('user_id', $user->id)
            ->whereMonth('start_at', $today->month)
            ->whereYear('start_at', $today->year)
            ->whereIn('status', ['pending', 'approved'])
            ->sum('duration_minutes');

        $myMonthAttendanceDays = Attendance::query()
            ->where('user_id', $user->id)
            ->whereMonth('date', $today->month)
            ->whereYear('date', $today->year)
            ->whereIn('status', ['hadir', 'kurang_jam', 'site_visit', 'ganti_hari'])
            ->count();

        $metrics = [
            'present_count' => $presentCount,
            'total_employees' => $totalEmployees,
            'site_visit_count' => $siteVisitCount,
            'active_projects_count' => $activeProjectsCount,
            'survey_projects_count' => $surveyProjectsCount,
            'urgent_projects_count' => $urgentProjectsCount,
            'urgent_project_names' => $urgentProjectNames ?: 'Tidak ada deadline mendesak',
            'my_active_projects_count' => $myActiveProjects->count(),
            'my_active_project_names' => $myActiveProjects->take(2)->pluck('name')->implode(' · ') ?: 'Belum ada proyek',
            'my_week_work_hours' => round($myWeekWorkMinutes / 60, 1),
            'my_overtime_hours' => round($myOvertimeMinutes / 60, 1),
            'my_month_attendance_days' => $myMonthAttendanceDays,
        ];

        $projectsQuery = Project::query()
            ->with(['members:id,name,photo_url', 'stages'])
            ->whereIn('status', $activeStatuses);

        if (! $user->isAdmin()) {
            $projectsQuery
                ->whereIn('project_type', $userProjectTypes)
                ->where(function ($q) use ($user): void {
                    $q->where('owner_id', $user->id)
                        ->orWhereHas('members', fn ($mq) => $mq->where('users.id', $user->id));
                });
        }

        $projects = $projectsQuery
            ->orderByRaw('CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC')
            ->take(4)
            ->get()
            ->map(function (Project $project) use ($today) {
                $daysLeft = $project->due_date ? (int) $today->diffInDays($project->due_date, false) : null;
                $activeStage = $project->stages->firstWhere('status', 'active') ?? $project->stages->first();
                $phase = $activeStage ? preg_replace('/^\d+\.\s*/', '', $activeStage->name) : 'Konsep';
                if ($project->status === 'done') {
                    $phase = 'Selesai';
                } elseif ($project->status === 'review' && ! $activeStage) {
                    $phase = 'Asistensi';
                }

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'client_name' => $project->client_name,
                    'location' => $project->location,
                    'category' => $project->package_name ?: ($project->category ?: 'Paket 1'),
                    'project_type' => $project->project_type ?? 'perencanaan',
                    'phase' => $phase,
                    'cover_image_url' => $project->cover_image_url ?: '/project-covers/rumah-tropis.png',
                    'status' => $project->status,
                    'progress_percent' => $project->progress_percent,
                    'due_date' => $project->due_date?->format('Y-m-d'),
                    'days_left' => $daysLeft,
                    'members' => $project->members->map(fn ($m) => [
                        'id' => $m->id,
                        'name' => $m->name,
                        'photo_url' => $m->photo_url,
                        'role_in_project' => $m->pivot?->role_in_project ?? 'Anggota',
                    ])->values(),
                ];
            });

        $calendarEvents = CalendarController::getUnifiedEvents(
            $today->copy()->subMonth()->startOfMonth(),
            $today->copy()->addMonths(2)->endOfMonth()
        );

        $activities = ActivityLog::query()
            ->with('user:id,name,photo_url')
            ->when(! $user->isSuperAdmin(), fn ($q) => $q->whereNotIn('action', [
                'payroll.generated',
                'payroll.item_updated',
                'employee.created',
                'employee.updated',
                'employee.status_toggled',
                'employee.deleted',
                'settings.updated',
            ]))
            ->latest()
            ->take(6)
            ->get()
            ->map(fn (ActivityLog $log) => [
                'id' => $log->id,
                'user_id' => $log->user_id,
                'action' => $log->action,
                'description' => $log->description,
                'time' => $log->created_at->format('H:i'),
                'created_at' => $log->created_at->toIso8601String(),
                'created_at_human' => $log->created_at->diffForHumans(),
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'photo_url' => $log->user->photo_url,
                ] : null,
            ]);

        $officeSetting = OfficeSetting::current();

        $projectOptions = Project::query()
            ->whereIn('status', ['planning', 'ongoing', 'review'])
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get();

        $todayDailyTasks = DailyTask::query()
            ->with(['project:id,name,client_name', 'projectTask:id,project_id,title,status', 'assignedBy:id,name'])
            ->where('user_id', $user->id)
            ->forDate($today)
            ->orderByRaw("CASE status WHEN 'in_progress' THEN 0 WHEN 'review' THEN 1 WHEN 'carried_over' THEN 2 WHEN 'done' THEN 3 ELSE 4 END")
            ->orderBy('id')
            ->get()
            ->map(fn (DailyTask $task): array => DailyTaskController::formatDailyTask($task))
            ->values();

        $dailyTaskProjects = DailyTaskController::getAccessibleProjectsWithKanbanTasks($user);

        return Inertia::render('Dashboard', [
            'metrics' => $metrics,
            'todayAttendance' => $todayAttendance,
            'projects' => $projects,
            'calendarEvents' => $calendarEvents,
            'activities' => $activities,
            'officeSetting' => $officeSetting,
            'projectOptions' => $projectOptions,
            'todayDailyTasks' => $todayDailyTasks,
            'dailyTaskProjects' => $dailyTaskProjects,
        ]);
    }
}
