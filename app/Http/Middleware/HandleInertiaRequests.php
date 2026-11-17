<?php

namespace App\Http\Middleware;

use App\Models\Attendance;
use App\Models\OfficeSetting;
use App\Models\Overtime;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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

        $elapsedSeconds = 0;
        $cooldownRemainingSeconds = 3600;
        if ($todayAtt?->check_in_at) {
            if ($todayAtt->check_out_at) {
                $elapsedSeconds = $todayAtt->actual_work_minutes !== null
                    ? $todayAtt->actual_work_minutes * 60
                    : max(0, (int) $todayAtt->check_in_at->diffInSeconds($todayAtt->check_out_at));

                $cooldownMinutes = OfficeSetting::current()->overtime_cooldown_minutes ?: 60;
                $secondsSinceCheckout = max(0, (int) $todayAtt->check_out_at->diffInSeconds(now()));
                $cooldownRemainingSeconds = max(0, ($cooldownMinutes * 60) - $secondsSinceCheckout);
            } else {
                $elapsedSeconds = max(0, (int) $todayAtt->check_in_at->diffInSeconds(now()));
            }
        }

        return [
            ...parent::share($request),
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
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
