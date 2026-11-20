<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'project_id',
    'name',
    'order',
    'status',
    'update_design_date',
    'client_response_date',
    'output_notes',
    'duration_workdays',
])]
class ProjectStage extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'order' => 'integer',
            'update_design_date' => 'date',
            'client_response_date' => 'date',
            'duration_workdays' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return HasMany<ProjectTask, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class, 'stage_id');
    }
}
