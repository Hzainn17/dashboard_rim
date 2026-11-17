<?php

namespace Database\Factories;

use App\Models\CalendarEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<CalendarEvent>
 */
class CalendarEventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startAt = Carbon::instance(fake()->dateTimeBetween('now', '+2 weeks'))->setTime(fake()->numberBetween(9, 16), 0);

        return [
            'title' => fake()->randomElement(['Rapat Klien', 'Review Desain', 'Site Visit', 'Presentasi Konsep']),
            'description' => fake()->sentence(),
            'location' => fake()->randomElement(['Kantor Studio', 'Google Meet', 'Lokasi Proyek']),
            'type' => 'meeting',
            'start_at' => $startAt,
            'end_at' => $startAt->copy()->addHours(2),
            'is_all_day' => false,
            'created_by' => User::factory()->admin(),
        ];
    }
}
