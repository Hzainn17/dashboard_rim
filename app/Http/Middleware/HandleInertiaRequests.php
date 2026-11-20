<?php

namespace App\Http\Middleware;

use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\LeaveRequest;
use App\Models\OfficeSetting;
use App\Models\Overtime;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user()?->load('employee');
        $todayAtt = $user
            ? Attendance::query()
                ->where('user_id', $user->id)
                ->whereDate('date', Carbon::today())
                ->first()
            : null;

        $activeOvertime = $user
            ? Overtime::query()
                ->with('project:id,name')
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->latest('start_at')
                ->first()
            : null;

        $todayOvertime = $user
            ? Overtime::query()
                ->with('project:id,name')
                ->where('user_id', $user->id)
                ->whereDate('start_at', Carbon::today())
                ->whereIn('status', ['active', 'pending', 'approved'])
                ->latest('start_at')
                ->first()
            : null;

        $hasLeaveToday = $user
            ? LeaveRequest::query()
                ->where('user_id', $user->id)
                ->whereDate('start_date', '<=', Carbon::today())
                ->whereDate('end_date', '>=', Carbon::today())
                ->where('status', 'approved')
                ->exists()
            : false;

        $unclosedPastAtt = $user
            ? Attendance::query()
                ->where('user_id', $user->id)
                ->whereDate('date', '<', Carbon::today())
                ->whereNotNull('check_in_at')
                ->where(function ($q): void {
                    $q->whereNull('check_out_at')
                        ->orWhere('is_auto_closed', true);
                })
                ->latest('date')
                ->first()
            : null;

        $cooldownMinutes = Schema::hasTable('office_settings')
            ? (OfficeSetting::current()->overtime_cooldown_minutes ?? 60)
            : 60;
        $elapsedSeconds = 0;
        $cooldownRemainingSeconds = $cooldownMinutes * 60;
        if ($todayAtt?->check_in_at) {
            if ($todayAtt->check_out_at) {
                $elapsedSeconds = $todayAtt->actual_work_minutes !== null
                    ? $todayAtt->actual_work_minutes * 60
                    : max(0, (int) $todayAtt->check_in_at->diffInSeconds($todayAtt->check_out_at));

                $secondsSinceCheckout = max(0, (int) $todayAtt->check_out_at->diffInSeconds(now()));
                $cooldownRemainingSeconds = max(0, ($cooldownMinutes * 60) - $secondsSinceCheckout);
            } else {
                $elapsedSeconds = max(0, (int) $todayAtt->check_in_at->diffInSeconds(now()));
            }
        }

        $officeSetting = Schema::hasTable('office_settings')
            ? OfficeSetting::current()
            : null;

        return [
            ...parent::share($request),
            'studio' => [
                'name' => $officeSetting?->office_name ?: config('app.name'),
                'logo_url' => $officeSetting?->company_logo_url ?: '/rim-projects-logo.png',
            ],
            'auth' => [
                'user' => $user,
                'todayAttendance' => $todayAtt ? [
                    'id' => $todayAtt->id,
                    'mode' => $todayAtt->mode,
                    'status' => $todayAtt->status,
                    'check_in_at' => $todayAtt->check_in_at?->toIso8601String(),
                    'check_out_at' => $todayAtt->check_out_at?->toIso8601String(),
                    'elapsed_seconds' => $elapsedSeconds,
                    'cooldown_remaining_seconds' => $cooldownRemainingSeconds,
                    'target_work_minutes' => $todayAtt->target_work_minutes ?: 540,
                    'site_visit_project_id' => $todayAtt->site_visit_project_id,
                    'site_visit_photo_url' => $todayAtt->site_visit_photo_url,
                    'notes' => $todayAtt->notes,
                ] : null,
                'activeOvertime' => $activeOvertime ? [
                    'id' => $activeOvertime->id,
                    'project_id' => $activeOvertime->project_id,
                    'project_name' => $activeOvertime->project?->name ?? 'Proyek Studio',
                    'task_description' => $activeOvertime->task_description,
                    'start_at' => $activeOvertime->start_at->toIso8601String(),
                    'elapsed_seconds' => max(0, (int) $activeOvertime->start_at->diffInSeconds(now())),
                    'status' => $activeOvertime->status,
                ] : null,
                'todayOvertime' => $todayOvertime ? [
                    'id' => $todayOvertime->id,
                    'project_id' => $todayOvertime->project_id,
                    'project_name' => $todayOvertime->project?->name ?? 'Proyek Studio',
                    'task_description' => $todayOvertime->task_description,
                    'start_time' => $todayOvertime->start_at->format('H:i'),
                    'end_time' => $todayOvertime->end_at?->format('H:i'),
                    'duration_minutes' => $todayOvertime->duration_minutes,
                    'status' => $todayOvertime->status,
                ] : null,
                'hasLeaveToday' => $hasLeaveToday,
                'workType' => $user?->employee?->work_type ?? 'kantor',
                'unclosedPastAttendance' => $unclosedPastAtt ? [
                    'id' => $unclosedPastAtt->id,
                    'date' => $unclosedPastAtt->date->format('Y-m-d'),
                    'date_formatted' => $unclosedPastAtt->date->format('d M Y'),
                    'check_in_time' => $unclosedPastAtt->check_in_at?->format('H:i'),
                    'target_time' => $unclosedPastAtt->check_in_at
                        ? $unclosedPastAtt->check_in_at->copy()->addMinutes($unclosedPastAtt->target_work_minutes ?: 540)->format('H:i')
                        : '17:00',
                ] : null,
            ],
            'notifications' => $user ? $this->buildNotifications($user) : [],
            'siteVisitProjects' => fn (): array => $user && Schema::hasColumn('projects', 'project_type')
                ? Project::siteVisitOptionsFor($user)
                : [],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }

    /**
     * Build persistent database-backed notifications for the header bell menu.
     *
     * @return array<int, array{id: int, title: string, time: string, unread: bool, url: string|null}>
     */
    private function buildNotifications(User $user): array
    {
        $query = ActivityLog::query()->latest('id');

        if (! $user->isAdmin()) {
            $query->whereNotIn('action', [
                'payroll.generated',
                'payroll.item_updated',
                'employee.created',
                'employee.updated',
                'employee.status_toggled',
                'settings.updated',
            ]);
        }

        $readAt = $user->notifications_read_at;

        return $query
            ->limit(8)
            ->get()
            ->map(function (ActivityLog $log) use ($user, $readAt): array {
                $action = $log->action ?? '';
                $url = match (true) {
                    str_starts_with($action, 'payroll.') => $user->isAdmin() ? route('payroll.index') : route('my-profile.index'),
                    str_starts_with($action, 'project.') => route('projects.index'),
                    str_starts_with($action, 'calendar.') => route('calendar.index'),
                    str_starts_with($action, 'attendance.'), str_starts_with($action, 'leave.'), str_starts_with($action, 'overtime.') => $user->isAdmin() ? route('attendance.approvals') : route('attendance.index'),
                    default => route('dashboard'),
                };

                $isUnread = $readAt
                    ? ($log->created_at?->gt($readAt) ?? false)
                    : true;

                return [
                    'id' => $log->id,
                    'title' => $log->description,
                    'time' => $log->created_at?->diffForHumans() ?? 'Baru saja',
                    'unread' => $isUnread,
                    'url' => $url,
                ];
            })
            ->values()
            ->all();
    }
}
