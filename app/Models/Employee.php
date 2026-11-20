<?php

namespace App\Models;

use Database\Factories\EmployeeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id', 'employee_code', 'position', 'department', 'work_type', 'join_date',
    'base_salary', 'fixed_allowance', 'overtime_rate_per_hour',
    'bank_name', 'bank_account_number', 'bank_account_holder', 'bank_branch',
    'annual_leave_quota', 'employment_status',
])]
class Employee extends Model
{
    /** @use HasFactory<EmployeeFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'join_date' => 'date',
            'base_salary' => 'decimal:2',
            'fixed_allowance' => 'decimal:2',
            'overtime_rate_per_hour' => 'decimal:2',
            'annual_leave_quota' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
