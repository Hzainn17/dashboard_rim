<?php

namespace App\Models;

use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'name', 'client_name', 'client_phone', 'location', 'category',
    'package_name', 'project_type', 'package_addons', 'building_area', 'estimated_budget', 'custom_scope_notes',
    'cover_image_url', 'drive_url', 'description', 'status',
    'progress_percent', 'start_date', 'due_date', 'owner_id',
])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory, SoftDeletes;

    /**
     * Available project scopes (lingkup proyek).
     *
     * @var array<string, string>
     */
    public const TYPES = [
        'perencanaan' => 'Perencanaan (Desain Saja)',
        'pembangunan' => 'Pembangunan (Fisik Lapangan)',
        'desain_bangun' => 'Desain & Bangun',
    ];

    /**
     * Project types that have a physical construction site.
     *
     * @var list<string>
     */
    public const FIELD_TYPES = ['pembangunan', 'desain_bangun'];

    /**
     * Determine whether the project has a running construction site.
     */
    public function hasFieldSite(): bool
    {
        return in_array($this->project_type ?? 'perencanaan', self::FIELD_TYPES, true);
    }

    /**
     * Build the Site Visit project options for an employee.
     *
     * Field employees (karyawan lapangan) only see construction projects, while
     * office employees see construction projects first plus planning projects
     * (e.g. for an initial land survey).
     *
     * @return list<array{id: int, name: string, location: string|null, client_name: string|null, project_type: string, group: string}>
     */
    public static function siteVisitOptionsFor(?User $user): array
    {
        $isFieldWorker = $user?->isFieldWorker() ?? false;

        return self::query()
            ->whereIn('status', ['planning', 'ongoing', 'review'])
            ->when($isFieldWorker, fn ($q) => $q->whereIn('project_type', self::FIELD_TYPES))
            ->orderByRaw("CASE WHEN project_type IN ('pembangunan', 'desain_bangun') THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get(['id', 'name', 'location', 'client_name', 'project_type'])
            ->map(fn (Project $p): array => [
                'id' => $p->id,
                'name' => $p->name,
                'location' => $p->location,
                'client_name' => $p->client_name,
                'project_type' => $p->project_type ?? 'perencanaan',
                'group' => $p->hasFieldSite() ? 'lapangan' : 'perencanaan',
            ])
            ->values()
            ->all();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'due_date' => 'date',
            'progress_percent' => 'integer',
            'package_addons' => 'array',
            'building_area' => 'float',
            'estimated_budget' => 'integer',
        ];
    }

    /**
     * Recalculate progress based on the share of tasks marked as done.
     */
    public function recalculateProgress(): void
    {
        $totalTasks = $this->tasks()->count();
        $doneTasks = $this->tasks()->where('status', 'done')->count();

        $this->update([
            'progress_percent' => $totalTasks > 0 ? (int) round($doneTasks / $totalTasks * 100) : 0,
        ]);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_members')
            ->withPivot('role_in_project')
            ->withTimestamps();
    }

    /**
     * @return HasMany<ProjectStage, $this>
     */
    public function stages(): HasMany
    {
        return $this->hasMany(ProjectStage::class)->orderBy('order');
    }

    /**
     * @return HasMany<ProjectTask, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class);
    }

    /**
     * @return HasMany<ProjectUpdate, $this>
     */
    public function updates(): HasMany
    {
        return $this->hasMany(ProjectUpdate::class)->latest();
    }

    /**
     * @return HasOne<ProjectClientBrief, $this>
     */
    public function clientBrief(): HasOne
    {
        return $this->hasOne(ProjectClientBrief::class);
    }

    /**
     * @return HasMany<CalendarEvent, $this>
     */
    public function calendarEvents(): HasMany
    {
        return $this->hasMany(CalendarEvent::class);
    }

    /**
     * @return HasMany<Overtime, $this>
     */
    public function overtimes(): HasMany
    {
        return $this->hasMany(Overtime::class);
    }
}
