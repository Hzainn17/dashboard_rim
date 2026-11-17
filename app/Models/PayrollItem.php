<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'payroll_id', 'user_id', 'base_salary', 'fixed_allowance', 'overtime_hours',
    'overtime_amount', 'bonus_amount', 'thr_amount', 'shortage_deduction',
    'alpha_deduction', 'other_deduction', 'total_allowance', 'total_deduction',
    'net_salary', 'present_days', 'absent_days', 'shortage_minutes',
    'is_manual_override', 'bank_name', 'bank_account_number',
    'bank_account_holder', 'slip_file_url',
])]
class PayrollItem extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'base_salary' => 'decimal:2',
            'fixed_allowance' => 'decimal:2',
            'overtime_hours' => 'decimal:2',
            'overtime_amount' => 'decimal:2',
            'bonus_amount' => 'decimal:2',
            'thr_amount' => 'decimal:2',
            'shortage_deduction' => 'decimal:2',
            'alpha_deduction' => 'decimal:2',
            'other_deduction' => 'decimal:2',
            'total_allowance' => 'decimal:2',
            'total_deduction' => 'decimal:2',
            'net_salary' => 'decimal:2',
            'present_days' => 'integer',
            'absent_days' => 'integer',
            'shortage_minutes' => 'integer',
            'is_manual_override' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Payroll, $this>
     */
    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<PayrollComponent, $this>
     */
    public function components(): HasMany
    {
        return $this->hasMany(PayrollComponent::class);
    }
}
