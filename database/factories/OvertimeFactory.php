<?php

namespace Database\Factories;

use App\Models\Overtime;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<Overtime>
 */
class OvertimeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startAt = Carbon::instance(fake()->dateTimeBetween('-30 days', 'yesterday'))->setTime(19, 0);
        $durationMinutes = fake()->randomElement([60, 120, 180]);

        return [
            'user_id' => User::factory(),
            'source' => 'regular',
            'start_at' => $startAt,
            'end_at' => $startAt->copy()->addMinutes($durationMinutes),
            'duration_minutes' => $durationMinutes,
            'task_description' => fake()->sentence(),
            'status' => 'pending',
        ];
    }

    /**
     * Indicate that the overtime has been approved.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'approved_at' => now(),
        ]);
    }
}
