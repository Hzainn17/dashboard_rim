<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'period_name', 'type', 'start_date', 'end_date', 'thr_reference_date',
    'period_month', 'period_year', 'status', 'total_amount', 'generated_by',
    'finalized_at', 'paid_at',
])]
class Payroll extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'thr_reference_date' => 'date',
            'period_month' => 'integer',
            'period_year' => 'integer',
            'total_amount' => 'decimal:2',
            'finalized_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    /**
     * Determine whether the payroll can still be edited.
     */
    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    /**
     * Determine whether this payroll period is an annual THR run.
     */
    public function isThr(): bool
    {
        return $this->type === 'thr';
    }

    /**
     * @return HasMany<PayrollItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
