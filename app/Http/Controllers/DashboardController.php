<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\CalendarEvent;
use App\Models\OfficeSetting;
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
        $urgentProjectsCount = Project::query()
            ->whereIn('status', ['planning', 'ongoing', 'review'])
            ->whereNotNull('due_date')
            ->where('due_date', '<=', Carbon::now()->addDays(7))
            ->count();

        $metrics = [
            'present_count' => $presentCount,
            'total_employees' => $totalEmployees > 0 ? $totalEmployees : 1,
            'site_visit_count' => $siteVisitCount,
            'active_projects_count' => $activeProjectsCount,
            'urgent_projects_count' => $urgentProjectsCount,
        ];

        $todayAttendance = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        $projects = Project::query()
            ->with(['members:id,name,photo_url', 'stages'])
            ->whereIn('status', ['planning', 'ongoing', 'review'])
            ->orderBy('due_date')
            ->take(6)
            ->get()
            ->map(function (Project $project) {
                $daysLeft = $project->due_date ? (int) Carbon::now()->diffInDays($project->due_date, false) : null;

                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'client_name' => $project->client_name,
                    'location' => $project->location,
                    'category' => $project->category ?? 'Residensial',
                    'cover_image_url' => $project->cover_image_url,
                    'status' => $project->status,
                    'progress_percent' => $project->progress_percent,
                    'due_date' => $project->due_date?->format('Y-m-d'),
                    'days_left' => $daysLeft !== null ? max(0, $daysLeft) : 0,
                    'members' => $project->members->map(fn ($m) => [
                        'id' => $m->id,
                        'name' => $m->name,
                        'photo_url' => $m->photo_url,
                        'role_in_project' => $m->pivot?->role_in_project ?? 'Anggota',
                    ]),
                ];
            });

        $calendarEvents = CalendarEvent::query()
            ->whereDate('start_at', '>=', $today)
            ->whereDate('start_at', '<=', Carbon::now()->addDays(30))
            ->orderBy('start_at')
            ->take(8)
            ->get()
            ->map(fn (CalendarEvent $event) => [
                'id' => $event->id,
                'title' => $event->title,
                'description' => $event->description,
                'location' => $event->location,
                'type' => $event->type,
                'start_at' => $event->start_at->toIso8601String(),
                'end_at' => $event->end_at->toIso8601String(),
                'time' => $event->start_at->format('H:i'),
                'end' => $event->end_at->format('H:i'),
                'is_all_day' => $event->is_all_day,
            ]);

        $activities = ActivityLog::query()
            ->with('user:id,name,photo_url')
            ->latest()
            ->take(8)
            ->get();

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
