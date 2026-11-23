<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\ProductionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductionSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_production_seeder_creates_only_admin_and_office_settings(): void
    {
        $this->seed(ProductionSeeder::class);

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('employees', 1);
        $this->assertDatabaseCount('office_settings', 1);
        $this->assertDatabaseCount('projects', 0);

        $admin = User::first();
        $this->assertNotNull($admin);
        $this->assertTrue($admin->isSuperAdmin());
        $this->assertTrue($admin->isAdmin());
        $this->assertTrue($admin->is_active);
    }

    public function test_make_admin_command_creates_admin_user_via_options(): void
    {
        $this->artisan('make:admin', [
            '--name' => 'Owner Studio',
            '--email' => 'owner@rimstudio.com',
            '--password' => 'secret12345',
        ])->assertSuccessful();

        $this->assertDatabaseHas('users', [
            'email' => 'owner@rimstudio.com',
            'name' => 'Owner Studio',
            'role' => 'super_admin',
        ]);
    }
}
