<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

#[Fillable(['name', 'email', 'password', 'role', 'phone', 'is_active', 'photo_url', 'notifications_read_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'notifications_read_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'is_active' => 'boolean',
        ];
    }

    /**
     * Determine whether the user is a studio admin.
     */
    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    /**
     * Determine whether the user is a field employee (karyawan lapangan).
     */
    public function isFieldWorker(): bool
    {
        return ($this->employee?->work_type ?? 'kantor') === 'lapangan';
    }

    /**
     * Daily target working hours: 8 hours for field workers (08:00-16:00),
     * or the studio standard (default 9 hours, 08:00-17:00) for office workers.
     */
    public function dailyTargetWorkHours(): int
    {
        if ($this->isFieldWorker()) {
            return 8;
        }

        return OfficeSetting::current()->standard_work_hours ?: 9;
    }

    /**
     * Daily target working minutes.
     */
    public function dailyTargetWorkMinutes(): int
    {
        return $this->dailyTargetWorkHours() * 60;
    }

    /**
     * Determine whether the given date is a weekly off day for this employee.
     * Field workers work Monday-Saturday (off on Sunday only).
     * Office workers work Monday-Friday (off on Saturday & Sunday).
     */
    public function isOffDay(Carbon $date): bool
    {
        if ($this->isFieldWorker()) {
            return $date->isSunday();
        }

        return $date->isWeekend();
    }

    /**
     * Scope a query to only include active users.
     *
     * @param  Builder<User>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * @return HasOne<Employee, $this>
     */
    public function employee(): HasOne
    {
        return $this->hasOne(Employee::class);
    }

    /**
     * @return HasMany<Project, $this>
     */
    public function ownedProjects(): HasMany
    {
        return $this->hasMany(Project::class, 'owner_id');
    }

    /**
     * @return BelongsToMany<Project, $this>
     */
    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_members')
            ->withPivot('role_in_project')
            ->withTimestamps();
    }

    /**
     * @return HasMany<ProjectTask, $this>
     */
    public function assignedTasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class, 'assignee_id');
    }

    /**
     * @return HasMany<Attendance, $this>
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * @return HasMany<Overtime, $this>
     */
    public function overtimes(): HasMany
    {
        return $this->hasMany(Overtime::class);
    }

    /**
     * @return HasMany<LeaveRequest, $this>
     */
    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    /**
     * @return BelongsToMany<CalendarEvent, $this>
     */
    public function calendarEvents(): BelongsToMany
    {
        return $this->belongsToMany(CalendarEvent::class, 'event_participants', 'user_id', 'event_id')
            ->withPivot('response_status')
            ->withTimestamps();
    }

    /**
     * @return HasMany<PayrollItem, $this>
     */
    public function payrollItems(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }

    /**
     * @return HasMany<ActivityLog, $this>
     */
    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }
}
