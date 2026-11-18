<?php

namespace App\Models;

use Database\Factories\AttendanceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id', 'date', 'mode', 'is_weekend', 'compensation_type', 'exchange_date',
    'compensation_status', 'check_in_at', 'check_out_at',
    'check_in_lat', 'check_in_lng', 'check_out_lat', 'check_out_lng',
    'check_in_distance_meters', 'target_work_minutes', 'actual_work_minutes',
    'shortage_minutes', 'status', 'is_auto_closed', 'adjustment_type',
    'adjustment_status', 'adjusted_check_in_at', 'adjusted_check_out_at',
    'adjustment_reason', 'site_visit_project_id', 'site_visit_photo_url',
    'site_visit_status', 'approved_by', 'approved_at', 'notes',
])]
class Attendance extends Model
{
    /** @use HasFactory<AttendanceFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'exchange_date' => 'date',
            'is_weekend' => 'boolean',
            'is_auto_closed' => 'boolean',
            'check_in_at' => 'datetime',
            'check_out_at' => 'datetime',
            'adjusted_check_in_at' => 'datetime',
            'adjusted_check_out_at' => 'datetime',
            'approved_at' => 'datetime',
            'check_in_lat' => 'decimal:7',
            'check_in_lng' => 'decimal:7',
            'check_out_lat' => 'decimal:7',
            'check_out_lng' => 'decimal:7',
            'check_in_distance_meters' => 'integer',
            'target_work_minutes' => 'integer',
            'actual_work_minutes' => 'integer',
            'shortage_minutes' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function siteVisitProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'site_visit_project_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * @return HasMany<Overtime, $this>
     */
    public function overtimes(): HasMany
    {
        return $this->hasMany(Overtime::class);
    }
}
