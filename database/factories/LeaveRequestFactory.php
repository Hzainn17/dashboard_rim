<?php

namespace Database\Factories;

use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<LeaveRequest>
 */
class LeaveRequestFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = Carbon::instance(fake()->dateTimeBetween('+1 day', '+1 month'));
        $totalDays = fake()->numberBetween(1, 3);

        return [
            'user_id' => User::factory(),
            'type' => fake()->randomElement(['izin', 'cuti', 'sakit']),
            'start_date' => $startDate->toDateString(),
            'end_date' => $startDate->copy()->addDays($totalDays - 1)->toDateString(),
            'total_days' => $totalDays,
            'reason' => fake()->sentence(),
            'status' => 'pending',
        ];
    }
}
