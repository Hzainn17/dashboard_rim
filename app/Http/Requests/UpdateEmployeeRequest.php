<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) $this->user()?->isSuperAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var User $employeeUser */
        $employeeUser = $this->route('employee');
        $employeeId = $employeeUser->employee?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($employeeUser->id),
            ],
            'password' => ['nullable', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:20'],
            'role' => ['required', Rule::enum(UserRole::class)],
            'employee_code' => [
                'required',
                'string',
                'max:20',
                Rule::unique('employees', 'employee_code')->ignore($employeeId),
            ],
            'position' => ['required', 'string', 'max:100'],
            'department' => ['nullable', 'string', 'max:100'],
            'work_type' => ['nullable', Rule::in(['kantor', 'lapangan'])],
            'join_date' => ['required', 'date'],
            'employment_status' => ['required', Rule::in(['tetap', 'kontrak', 'magang'])],
            'annual_leave_quota' => ['required', 'integer', 'min:0', 'max:60'],
            'base_salary' => ['required', 'numeric', 'min:0'],
            'fixed_allowance' => ['nullable', 'numeric', 'min:0'],
            'overtime_rate_per_hour' => ['nullable', 'numeric', 'min:0'],
            'bank_name' => ['nullable', 'string', 'max:50'],
            'bank_account_number' => ['nullable', 'string', 'max:30'],
            'bank_account_holder' => ['nullable', 'string', 'max:255'],
            'bank_branch' => ['nullable', 'string', 'max:100'],
        ];
    }
}
