<?php

namespace App\Models;

use App\Services\ClientBriefTemplate;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable(['project_id', 'token', 'status', 'fields', 'responses', 'sent_at', 'submitted_at'])]
class ProjectClientBrief extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'fields' => 'array',
            'responses' => 'array',
            'sent_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    /**
     * Get or create the brief form for a project, seeded with the default template.
     */
    public static function forProject(Project $project): self
    {
        return self::query()->firstOrCreate(
            ['project_id' => $project->id],
            [
                'token' => Str::random(40),
                'status' => 'draft',
                'fields' => ClientBriefTemplate::defaultFields(),
                'responses' => [],
            ],
        );
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
