<?php

namespace Tests\Feature;

use App\Models\LoginPortfolio;
use App\Models\OfficeSetting;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_web_responses_include_security_headers(): void
    {
        $response = $this->get('/login');

        $response->assertOk()
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    public function test_deactivated_user_is_logged_out_immediately(): void
    {
        $employee = User::factory()->create(['is_active' => false]);

        $this->actingAs($employee)
            ->get('/dashboard')
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_unassigned_employee_cannot_access_other_projects_or_pdfs(): void
    {
        $admin = User::factory()->admin()->create();
        $assigned = User::factory()->create();
        $outsider = User::factory()->create();

        $project = Project::factory()->create(['owner_id' => $admin->id]);
        $project->members()->attach($assigned->id, ['role_in_project' => 'Tim Desain']);

        // Outsider is blocked on detail, timeline print, and brief print
        $this->actingAs($outsider)->get(route('projects.show', $project))->assertForbidden();
        $this->actingAs($outsider)->get(route('projects.timeline.print', $project))->assertForbidden();
        $this->actingAs($outsider)->get(route('projects.brief.print', $project))->assertForbidden();

        // Assigned team member and admin are allowed
        $this->actingAs($assigned)->get(route('projects.show', $project))->assertOk();
        $this->actingAs($assigned)->get(route('projects.timeline.print', $project))->assertOk();
        $this->actingAs($assigned)->get(route('projects.brief.print', $project))->assertOk();
        $this->actingAs($admin)->get(route('projects.show', $project))->assertOk();
    }

    public function test_office_setting_and_login_portfolio_caches_invalidate_on_update(): void
    {
        Cache::flush();

        $setting = OfficeSetting::current();
        $this->assertTrue(Cache::has(OfficeSetting::CACHE_KEY));

        $setting->update(['office_name' => 'RIM Studio Updated']);
        $this->assertFalse(Cache::has(OfficeSetting::CACHE_KEY));
        $this->assertSame('RIM Studio Updated', OfficeSetting::current()->office_name);

        $slidesBefore = LoginPortfolio::cachedSlides();
        $this->assertTrue(Cache::has(LoginPortfolio::CACHE_KEY));

        LoginPortfolio::query()->create([
            'title' => 'Villa Baru',
            'image_url' => '/project-covers/rumah-tropis.png',
            'sort_order' => 1,
        ]);

        $this->assertFalse(Cache::has(LoginPortfolio::CACHE_KEY));
        $this->assertCount(count($slidesBefore) + 1, LoginPortfolio::cachedSlides());
    }
}
