<?php

namespace Tests\Feature;

use App\Models\DailyTask;
use App\Models\Employee;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DailyTaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_can_add_daily_subtask_under_kanban_without_duplicating_kanban_cards(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $employee = User::factory()->create();
        Employee::factory()->for($employee)->create(['department' => 'Perencanaan']);

        $project = Project::factory()->create(['owner_id' => $admin->id, 'status' => 'ongoing']);
        $project->members()->attach($employee->id, ['role_in_project' => 'Arsitek']);

        $kanbanCard = ProjectTask::factory()->create([
            'project_id' => $project->id,
            'assignee_id' => $employee->id,
            'title' => 'DED Arsitektur',
            'status' => 'todo',
        ]);

        $this->actingAs($employee)
            ->post(route('daily-tasks.store'), [
                'title' => 'Cek draft DED lantai 2',
                'project_id' => $project->id,
                'project_task_id' => $kanbanCard->id,
                'notes' => 'Fokus potongan A-A',
            ])
            ->assertRedirect();

        // Kanban board remains clean (still 1 card), and parent card auto-moves todo -> in_progress
        $this->assertDatabaseCount('project_tasks', 1);
        $this->assertSame('in_progress', $kanbanCard->fresh()->status);

        $this->assertDatabaseHas('daily_tasks', [
            'user_id' => $employee->id,
            'project_id' => $project->id,
            'project_task_id' => $kanbanCard->id,
            'title' => 'Cek draft DED lantai 2',
            'status' => 'in_progress',
        ]);
    }

    public function test_employee_cannot_create_daily_task_for_unassigned_project_or_other_users(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $outsider = User::factory()->create();
        $otherEmployee = User::factory()->create();
        $project = Project::factory()->create(['owner_id' => $admin->id]);

        $this->actingAs($outsider)
            ->post(route('daily-tasks.store'), [
                'title' => 'Akses ilegal',
                'project_id' => $project->id,
            ])
            ->assertForbidden();

        $this->actingAs($outsider)
            ->post(route('daily-tasks.store'), [
                'title' => 'Titip ilegal',
                'user_id' => $otherEmployee->id,
            ])
            ->assertForbidden();
    }

    public function test_employee_can_create_general_non_project_task_and_pm_can_acc_kanban_review(): void
    {
        $pm = User::factory()->admin()->create();
        Employee::factory()->for($pm)->create(['department' => 'Perencanaan']);

        $employee = User::factory()->create();
        Employee::factory()->for($employee)->create(['department' => 'Perencanaan']);

        $project = Project::factory()->create(['owner_id' => $pm->id, 'status' => 'ongoing']);
        $project->members()->attach($employee->id, ['role_in_project' => 'Tim Desain']);

        $kanbanCard = ProjectTask::factory()->create([
            'project_id' => $project->id,
            'assignee_id' => $employee->id,
            'title' => 'Konseptual V2',
            'status' => 'in_progress',
        ]);

        // General task without project
        $this->actingAs($employee)
            ->post(route('daily-tasks.store'), [
                'title' => 'Edit konten Reels IG studio',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('daily_tasks', [
            'user_id' => $employee->id,
            'project_id' => null,
            'title' => 'Edit konten Reels IG studio',
        ]);

        // Linked daily sub-task -> employee completes daily task WITHOUT forcibly closing Kanban card
        $dailyTask = DailyTask::query()->create([
            'user_id' => $employee->id,
            'work_date' => Carbon::today()->format('Y-m-d'),
            'project_id' => $project->id,
            'project_task_id' => $kanbanCard->id,
            'title' => 'Revisi fasad depan',
            'status' => 'in_progress',
        ]);

        $this->actingAs($employee)
            ->patch(route('daily-tasks.update', $dailyTask), [
                'status' => 'done',
            ])
            ->assertRedirect();

        $this->assertSame('done', $dailyTask->fresh()->status);
        $this->assertSame('in_progress', $kanbanCard->fresh()->status);

        // Employee proposes Review on Kanban parent
        $this->actingAs($employee)
            ->patch(route('daily-tasks.update', $dailyTask), [
                'status' => 'review',
                'sync_kanban_status' => 'review',
            ])
            ->assertRedirect();

        $this->assertSame('review', $kanbanCard->fresh()->status);

        // PM ACCs Review -> Done (+ Kanban parent done & progress recalculated)
        $this->actingAs($pm)
            ->patch(route('daily-tasks.update', $dailyTask), [
                'status' => 'done',
                'sync_kanban_status' => 'done',
            ])
            ->assertRedirect();

        $this->assertSame('done', $dailyTask->fresh()->status);
        $this->assertSame('done', $kanbanCard->fresh()->status);
        $this->assertSame(100, $project->fresh()->progress_percent);
    }

    public function test_checkout_summary_carry_over_marks_done_and_clones_unfinished_to_next_workday(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-24 17:05:00')); // Tuesday

        $employee = User::factory()->create();
        Employee::factory()->for($employee)->create(['work_type' => 'kantor']);

        $taskA = DailyTask::query()->create([
            'user_id' => $employee->id,
            'work_date' => '2026-11-24',
            'title' => 'Revisi denah lantai 1',
            'status' => 'in_progress',
        ]);

        $taskB = DailyTask::query()->create([
            'user_id' => $employee->id,
            'work_date' => '2026-11-24',
            'title' => 'Lanjut DED potongan B-B',
            'status' => 'in_progress',
        ]);

        $this->actingAs($employee)
            ->post(route('daily-tasks.carry-over'), [
                'mode' => 'checkout_summary',
                'items' => [
                    ['id' => $taskA->id, 'action' => 'done', 'notes' => 'Sudah dikirim ke PM'],
                    ['id' => $taskB->id, 'action' => 'carry_over', 'notes' => 'Baru 70%, lanjut besok'],
                ],
            ])
            ->assertRedirect();

        $this->assertSame('done', $taskA->fresh()->status);
        $this->assertSame('carried_over', $taskB->fresh()->status);

        // Cloned to next workday (Wednesday 2026-11-25) with carried_from_id linked
        $this->assertDatabaseHas('daily_tasks', [
            'user_id' => $employee->id,
            'work_date' => '2026-11-25 00:00:00',
            'carried_from_id' => $taskB->id,
            'title' => 'Lanjut DED potongan B-B',
            'status' => 'in_progress',
            'notes' => 'Baru 70%, lanjut besok',
        ]);

        Carbon::setTestNow();
    }

    public function test_pm_can_view_team_board_filtered_by_department_while_employee_cannot(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $leadArch = User::factory()->create(['name' => 'Alief Lead']);
        Employee::factory()->for($leadArch)->create([
            'department' => 'Perencanaan',
            'position' => 'Lead Arsitek',
        ]);

        $arch = User::factory()->create(['name' => 'Syifa']);
        Employee::factory()->for($arch)->create([
            'department' => 'Perencanaan',
            'position' => 'Junior Architect',
        ]);

        $mkt = User::factory()->create(['name' => 'Dewi']);
        Employee::factory()->for($mkt)->create([
            'department' => 'Digital Marketing',
            'position' => 'Digital Marketing',
        ]);

        DailyTask::query()->create([
            'user_id' => $arch->id,
            'work_date' => Carbon::today()->format('Y-m-d'),
            'title' => 'Konseptual V2 Pak Rudy',
            'status' => 'in_progress',
        ]);

        // Super Admin can filter across all divisions
        $this->actingAs($superAdmin)
            ->get(route('daily-tasks.index', ['department' => 'Semua']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('DailyTasks/Index')
                ->where('canFilterAllDepartments', true)
                ->where('canManageTeam', true)
                ->has('teamBoard', 3)
            );

        // Lead Arsitek is automatically a division PM scoped ONLY to Perencanaan (even if requesting another division)
        $this->actingAs($leadArch)
            ->get(route('daily-tasks.index', ['department' => 'Digital Marketing']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('DailyTasks/Index')
                ->where('selectedDepartment', 'Perencanaan')
                ->where('canFilterAllDepartments', false)
                ->where('canManageTeam', true)
                ->has('teamBoard', 2) // Alief Lead + Syifa only
            );

        // Lead Arsitek can assign task to Perencanaan member, but blocked from Digital Marketing member
        $this->actingAs($leadArch)
            ->post(route('daily-tasks.store'), [
                'user_id' => $arch->id,
                'title' => 'Cek draft DED',
            ])
            ->assertRedirect();

        $this->actingAs($leadArch)
            ->post(route('daily-tasks.store'), [
                'user_id' => $mkt->id,
                'title' => 'Lintas divisi ilegal',
            ])
            ->assertForbidden();

        // Regular employee in Perencanaan sees only Perencanaan teamBoard (read-only) + own tasks
        $this->actingAs($arch)
            ->get(route('daily-tasks.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('DailyTasks/Index')
                ->where('selectedDepartment', 'Perencanaan')
                ->where('canManageTeam', false)
                ->has('teamBoard', 2)
                ->has('myTasks', 2)
            );
    }

    public function test_review_directed_to_owner_can_only_be_approved_by_super_admin(): void
    {
        $owner = User::factory()->superAdmin()->create();
        $pm = User::factory()->admin()->create();
        Employee::factory()->for($pm)->create(['department' => 'Perencanaan']);

        $employee = User::factory()->create();
        Employee::factory()->for($employee)->create(['department' => 'Perencanaan']);

        $task = DailyTask::query()->create([
            'user_id' => $employee->id,
            'work_date' => Carbon::today()->format('Y-m-d'),
            'title' => 'Presentasi Konseptual V2 Pak Rudy',
            'status' => 'in_progress',
        ]);

        // Employee directs review straight to Owner (Super Admin)
        $this->actingAs($employee)
            ->patch(route('daily-tasks.update', $task), [
                'status' => 'review',
                'review_target' => 'owner',
            ])
            ->assertRedirect();

        $this->assertSame('owner', $task->fresh()->review_target);

        // Regular PM cannot approve Owner-directed review
        $this->actingAs($pm)
            ->patch(route('daily-tasks.update', $task), [
                'status' => 'done',
            ])
            ->assertForbidden();

        // Owner (Super Admin) can approve it
        $this->actingAs($owner)
            ->patch(route('daily-tasks.update', $task), [
                'status' => 'done',
            ])
            ->assertRedirect();

        $this->assertSame('done', $task->fresh()->status);
        $this->assertNull($task->fresh()->review_target);
    }
}
