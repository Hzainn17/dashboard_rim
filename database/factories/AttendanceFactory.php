<?php

namespace Database\Factories;

use App\Models\Attendance;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<Attendance>
 */
class AttendanceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $date = Carbon::instance(fake()->dateTimeBetween('-30 days', 'yesterday'))->startOfDay();
        $checkIn = $date->copy()->setTime(8, fake()->numberBetween(0, 59));
        $checkOut = $checkIn->copy()->addMinutes(540);

        return [
            'user_id' => User::factory(),
            'date' => $date->toDateString(),
            'mode' => 'office',
            'is_weekend' => $date->isWeekend(),
            'check_in_at' => $checkIn,
            'check_out_at' => $checkOut,
            'check_in_distance_meters' => fake()->numberBetween(5, 80),
            'target_work_minutes' => 540,
            'actual_work_minutes' => 540,
            'shortage_minutes' => 0,
            'status' => 'hadir',
        ];
    }

    /**
     * Indicate that the employee checked out before completing the target hours.
     */
    public function shortage(int $minutes = 60): static
    {
        return $this->state(fn (array $attributes) => [
            'check_out_at' => Carbon::parse($attributes['check_in_at'])->addMinutes(540 - $minutes),
            'actual_work_minutes' => 540 - $minutes,
            'shortage_minutes' => $minutes,
            'status' => 'kurang_jam',
        ]);
    }
}
