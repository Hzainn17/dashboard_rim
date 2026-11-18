<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\Attendance;
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

        $totalEmployees = User::query()->where('role', UserRole::Employee)->count();
        $presentCount = Attendance::query()
            ->whereDate('date', $today)
            ->whereIn('status', ['hadir', 'kurang_jam'])
            ->count();
        $siteVisitCount = Attendance::query()
            ->whereDate('date', $today)
            ->where('mode', 'site_visit')
            ->count();
        $activeProjectsCount = Project::query()
            ->whereIn('status', ['planning', 'ongoing', 'review'])
            ->count();
        $urgentProjects = Project::query()
            ->whereIn('status', ['planning', 'ongoing', 'review'])
            ->whereNotNull('due_date')
            ->where('due_date', '<=', Carbon::now()->addDays(7))
            ->orderBy('due_date')
            ->get(['id', 'name']);

        $urgentProjectsCount = $urgentProjects->count();
        $urgentProjectNames = $urgentProjects->take(2)->pluck('name')->implode(' · ');

        $myActiveProjects = Project::query()
            ->whereIn('status', ['planning', 'ongoing', 'review'])
            ->where(function ($q) use ($user): void {
                $q->where('owner_id', $user->id)
                    ->orWhereHas('members', fn ($mq) => $mq->where('users.id', $user->id));
            })
            ->orderBy('due_date')
            ->get(['id', 'name']);

        $myWeekWorkMinutes = (int) Attendance::query()
            ->where('user_id', $user->id)
            ->whereBetween('date', [$today->copy()->startOfWeek(), $today->copy()->endOfWeek()])
            ->sum('actual_work_minutes');

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
            'total_employees' => $totalEmployees > 0 ? $totalEmployees : 1,
            'site_visit_count' => $siteVisitCount,
            'active_projects_count' => $activeProjectsCount,
            'urgent_projects_count' => $urgentProjectsCount,
            'urgent_project_names' => $urgentProjectNames ?: 'Tidak ada deadline mendesak',
            'my_active_projects_count' => $myActiveProjects->count(),
            'my_active_project_names' => $myActiveProjects->take(2)->pluck('name')->implode(' · ') ?: 'Belum ada proyek',
            'my_week_work_hours' => round($myWeekWorkMinutes / 60, 1),
            'my_overtime_hours' => round($myOvertimeMinutes / 60, 1),
            'my_month_attendance_days' => $myMonthAttendanceDays,
        ];

        $todayAttendance = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        $projects = Project::query()
            ->with(['members:id,name,photo_url', 'stages'])
            ->whereIn('status', ['planning', 'ongoing', 'review'])
            ->orderByRaw('CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC')
            ->take(8)
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
                    'category' => $project->category ?: 'Residensial',
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

        return Inertia::render('Dashboard', [
            'metrics' => $metrics,
            'todayAttendance' => $todayAttendance,
            'projects' => $projects,
            'calendarEvents' => $calendarEvents,
            'activities' => $activities,
            'officeSetting' => $officeSetting,
            'projectOptions' => $projectOptions,
        ]);
    }
}
