<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

#[Fillable([
    'user_id',
    'assigned_by',
    'work_date',
    'project_id',
    'project_task_id',
    'carried_from_id',
    'title',
    'status',
    'review_target',
    'notes',
    'completed_at',
])]
class DailyTask extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'work_date' => 'date',
            'completed_at' => 'datetime',
            'project_id' => 'integer',
            'project_task_id' => 'integer',
            'carried_from_id' => 'integer',
        ];
    }

    /**
     * Scope daily tasks to a specific date.
     *
     * @param  Builder<DailyTask>  $query
     * @return Builder<DailyTask>
     */
    public function scopeForDate(Builder $query, Carbon|string $date): Builder
    {
        $dateStr = $date instanceof Carbon ? $date->format('Y-m-d') : $date;

        return $query->whereDate('work_date', $dateStr);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return BelongsTo<ProjectTask, $this>
     */
    public function projectTask(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'project_task_id');
    }

    /**
     * @return BelongsTo<DailyTask, $this>
     */
    public function carriedFrom(): BelongsTo
    {
        return $this->belongsTo(DailyTask::class, 'carried_from_id');
    }
}
