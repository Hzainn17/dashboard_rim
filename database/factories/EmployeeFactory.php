<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'employee_code' => fake()->unique()->numerify('RIM-###'),
            'position' => fake()->randomElement(['Lead Arsitek', 'Arsitek', 'Drafter', '3D Visualizer', 'Interior Designer']),
            'department' => fake()->randomElement(['Perencanaan', 'Pembangunan', 'Administrasi', 'Digital Marketing']),
            'join_date' => fake()->dateTimeBetween('-4 years', '-1 month'),
            'base_salary' => fake()->randomElement([4_500_000, 6_000_000, 8_000_000, 12_000_000]),
            'fixed_allowance' => fake()->randomElement([0, 500_000, 1_000_000]),
            'overtime_rate_per_hour' => 25_000,
            'bank_name' => fake()->randomElement(['BCA', 'BNI']),
            'bank_account_number' => fake()->numerify('##########'),
            'bank_account_holder' => fn (array $attributes) => User::find($attributes['user_id'])?->name,
            'annual_leave_quota' => 12,
            'employment_status' => 'tetap',
        ];
    }
}
