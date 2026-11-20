<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = fake()->dateTimeBetween('-3 months', 'now');

        return [
            'name' => fake()->randomElement(['Rumah Tinggal', 'Villa', 'Kantor', 'Kafe', 'Ruko']).' '.fake()->lastName(),
            'client_name' => fake()->name(),
            'client_phone' => fake()->numerify('08##########'),
            'location' => fake()->city(),
            'category' => fake()->randomElement(['Residensial', 'Komersial', 'Interior', 'Renovasi']),
            'project_type' => 'perencanaan',
            'description' => fake()->sentence(12),
            'status' => 'ongoing',
            'progress_percent' => 0,
            'start_date' => $startDate,
            'due_date' => fake()->dateTimeBetween('+2 weeks', '+6 months'),
            'owner_id' => User::factory()->admin(),
        ];
    }

    /**
     * Indicate that the project has a running construction site.
     */
    public function construction(): static
    {
        return $this->state(fn (array $attributes) => [
            'project_type' => 'pembangunan',
        ]);
    }
}
