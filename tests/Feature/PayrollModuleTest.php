<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Overtime;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PayrollModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_generate_payroll_aggregating_attendance_and_approved_overtime(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create([
            'base_salary' => 15_000_000,
            'fixed_allowance' => 1_000_000,
            'overtime_rate_per_hour' => 50_000,
        ]);

        $employee = User::factory()->create(['name' => 'Budi Santoso']);
        Employee::factory()->for($employee)->create([
            'base_salary' => 10_000_000,
            'fixed_allowance' => 500_000,
            'overtime_rate_per_hour' => 30_000,
            'bank_name' => 'BCA',
            'bank_account_number' => '1234567890',
        ]);

        $project = Project::factory()->create(['owner_id' => $admin->id]);
        $today = Carbon::today();

        $att = Attendance::factory()->create([
            'user_id' => $employee->id,
            'date' => $today->format('Y-m-d'),
            'status' => 'hadir',
            'shortage_minutes' => 0,
        ]);

        // 2 hours approved overtime -> 2 * 30,000 = 60,000
        Overtime::factory()->create([
            'user_id' => $employee->id,
            'attendance_id' => $att->id,
            'project_id' => $project->id,
            'start_at' => $today->copy()->setTime(19, 0),
            'end_at' => $today->copy()->setTime(21, 0),
            'duration_minutes' => 120,
            'status' => 'approved',
        ]);

        $response = $this->actingAs($admin)->post('/payroll/generate', [
            'period_name' => 'Payroll '.$today->translatedFormat('F Y'),
            'period_month' => $today->month,
            'period_year' => $today->year,
            'start_date' => $today->copy()->startOfMonth()->format('Y-m-d'),
            'end_date' => $today->copy()->endOfMonth()->format('Y-m-d'),
        ]);

        $response->assertRedirect();

        $payroll = Payroll::query()->first();
        $this->assertNotNull($payroll);
        $this->assertEquals('draft', $payroll->status);

        $budiItem = PayrollItem::query()
            ->where('payroll_id', $payroll->id)
            ->where('user_id', $employee->id)
            ->first();

        $this->assertNotNull($budiItem);
        $this->assertEquals(1, $budiItem->present_days);
        $this->assertEquals(2.0, (float) $budiItem->overtime_hours);
        $this->assertEquals(60000, (float) $budiItem->overtime_amount);
        // 10,000,000 + 500,000 + 60,000 = 10,560,000
        $this->assertEquals(10560000, (float) $budiItem->net_salary);
    }

    public function test_regular_employee_cannot_access_admin_payroll_management(): void
    {
        $employee = User::factory()->create();

        $this->actingAs($employee)->get('/payroll')->assertForbidden();
        $this->actingAs($employee)->post('/payroll/generate', [])->assertForbidden();
    }

    public function test_admin_can_override_bonus_finalize_mark_paid_and_export_bank_csv(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create(['base_salary' => 12_000_000]);

        $employee = User::factory()->create(['name' => 'Siti Rahma']);
        Employee::factory()->for($employee)->create([
            'base_salary' => 6_000_000,
            'fixed_allowance' => 0,
            'bank_name' => 'BNI',
            'bank_account_number' => '9988776655',
            'bank_account_holder' => 'Siti Rahma',
            'bank_branch' => 'Tasikmalaya',
        ]);

        $today = Carbon::today();

        $this->actingAs($admin)->post('/payroll/generate', [
            'period_name' => 'Payroll Test',
            'period_month' => $today->month,
            'period_year' => $today->year,
            'start_date' => $today->copy()->startOfMonth()->format('Y-m-d'),
            'end_date' => $today->copy()->endOfMonth()->format('Y-m-d'),
        ]);

        $payroll = Payroll::query()->firstOrFail();
        $sitiItem = PayrollItem::query()->where('user_id', $employee->id)->firstOrFail();

        // Override base_salary, fixed_allowance, overtime_amount, bonus & deduction for this period only
        $this->actingAs($admin)->put("/payroll/items/{$sitiItem->id}", [
            'base_salary' => 6_500_000,
            'fixed_allowance' => 250_000,
            'overtime_amount' => 100_000,
            'bonus_amount' => 1_000_000,
            'thr_amount' => 0,
            'shortage_deduction' => 0,
            'alpha_deduction' => 0,
            'other_deduction' => 250_000,
        ])->assertRedirect();

        // 6,500,000 + 250,000 + 100,000 + 1,000,000 - 250,000 = 7,600,000
        $this->assertEquals(7600000, (float) $sitiItem->fresh()->net_salary);
        // Master employee record remains untouched!
        $this->assertEquals(6_000_000, (float) $employee->employee->fresh()->base_salary);
        $this->assertEquals(0, (float) $employee->employee->fresh()->fixed_allowance);

        // Finalize & Mark Paid
        $this->actingAs($admin)->patch("/payroll/{$payroll->id}/finalize")->assertRedirect();
        $this->assertEquals('finalized', $payroll->fresh()->status);

        $this->actingAs($admin)->patch("/payroll/{$payroll->id}/mark-paid")->assertRedirect();
        $this->assertEquals('paid', $payroll->fresh()->status);

        // Export Bank CSV matching BNI / Rekap Bank Transfer template
        $csvResponse = $this->actingAs($admin)->get("/payroll/{$payroll->id}/export-bank");
        $csvResponse->assertOk();
        $csvResponse->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $csvContent = $csvResponse->streamedContent();
        $this->assertStringContainsString('"Rekap Bank Transfer","","","","","","",""', $csvContent);
        $this->assertStringContainsString('"RIM Project","","","","","","",""', $csvContent);
        $this->assertStringContainsString('"No.","Id Personalia","Nama","Nama Bank","Nama Pemilik Rekening","Nomor Rekening","Kantor Cabang Bank","Jumlah Transfer"', $csvContent);
        $this->assertStringContainsString('"SITI RAHMA","9988776655","TASIKMALAYA","7600000"', $csvContent);
    }

    public function test_admin_can_select_specific_employees_when_generating_payroll(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create(['base_salary' => 15_000_000]);

        $budi = User::factory()->create(['name' => 'Budi']);
        Employee::factory()->for($budi)->create(['base_salary' => 8_000_000]);

        $andi = User::factory()->create(['name' => 'Andi']);
        Employee::factory()->for($andi)->create(['base_salary' => 7_000_000]);

        $today = Carbon::today();
        $this->actingAs($admin)->post('/payroll/generate', [
            'period_name' => 'Payroll Selektif',
            'period_month' => $today->month,
            'period_year' => $today->year,
            'start_date' => $today->copy()->startOfMonth()->format('Y-m-d'),
            'end_date' => $today->copy()->endOfMonth()->format('Y-m-d'),
            'employee_ids' => [$budi->id],
        ])->assertRedirect();

        $payroll = Payroll::query()->firstOrFail();
        $this->assertDatabaseHas('payroll_items', [
            'payroll_id' => $payroll->id,
            'user_id' => $budi->id,
        ]);
        $this->assertDatabaseMissing('payroll_items', [
            'payroll_id' => $payroll->id,
            'user_id' => $andi->id,
        ]);
    }

    public function test_employee_can_view_own_finalized_slip_and_cannot_view_others_slip(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create();

        $emp1 = User::factory()->create(['name' => 'Budi']);
        Employee::factory()->for($emp1)->create(['base_salary' => 8_000_000]);

        $emp2 = User::factory()->create(['name' => 'Andi']);
        Employee::factory()->for($emp2)->create(['base_salary' => 7_000_000]);

        $today = Carbon::today();
        $this->actingAs($admin)->post('/payroll/generate', [
            'period_name' => 'Payroll November',
            'period_month' => $today->month,
            'period_year' => $today->year,
            'start_date' => $today->copy()->startOfMonth()->format('Y-m-d'),
            'end_date' => $today->copy()->endOfMonth()->format('Y-m-d'),
        ]);

        $payroll = Payroll::query()->firstOrFail();
        $emp1Item = PayrollItem::query()->where('user_id', $emp1->id)->firstOrFail();
        $emp2Item = PayrollItem::query()->where('user_id', $emp2->id)->firstOrFail();

        // While draft, employee cannot view slip
        $this->actingAs($emp1)->get('/my-slips')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Payroll/MySlips')
                ->has('slips', 0)
            );
        $this->actingAs($emp1)->get("/payroll/items/{$emp1Item->id}/slip")->assertForbidden();

        // Finalize payroll
        $this->actingAs($admin)->patch("/payroll/{$payroll->id}/finalize");

        // Now emp1 sees 1 slip & can open print view
        $this->actingAs($emp1)->get('/my-slips')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Payroll/MySlips')
                ->has('slips', 1)
            );
        $this->actingAs($emp1)->get("/payroll/items/{$emp1Item->id}/slip")->assertOk();

        // emp1 cannot open emp2's slip
        $this->actingAs($emp1)->get("/payroll/items/{$emp2Item->id}/slip")->assertForbidden();
    }

    public function test_admin_can_generate_thr_following_kemnaker_proration_rules(): void
    {
        $admin = User::factory()->admin()->create();
        Employee::factory()->for($admin)->create([
            'join_date' => '2024-01-01',
            'base_salary' => 12_000_000,
            'fixed_allowance' => 0,
        ]);

        // 1) Masa kerja >= 12 bulan (18 bulan) -> 100% (Gaji Pokok + Tunjangan Tetap) = 10,500,000
        $senior = User::factory()->create(['name' => 'Senior Arsitek']);
        Employee::factory()->for($senior)->create([
            'join_date' => '2025-06-01',
            'base_salary' => 10_000_000,
            'fixed_allowance' => 500_000,
        ]);

        // 2) Masa kerja 6 bulan -> 6/12 * (6,000,000 + 0) = 3,000,000
        $junior = User::factory()->create(['name' => 'Junior Drafter']);
        Employee::factory()->for($junior)->create([
            'join_date' => '2026-06-01',
            'base_salary' => 6_000_000,
            'fixed_allowance' => 0,
        ]);

        // 3) Masa kerja < 1 bulan (15 hari) -> Rp 0
        $probation = User::factory()->create(['name' => 'Magang Baru']);
        Employee::factory()->for($probation)->create([
            'join_date' => '2026-11-16',
            'base_salary' => 4_000_000,
            'fixed_allowance' => 0,
        ]);

        $response = $this->actingAs($admin)->post('/payroll/generate', [
            'period_name' => 'THR Keagamaan 2026',
            'type' => 'thr',
            'period_month' => 12,
            'period_year' => 2026,
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-31',
            'thr_reference_date' => '2026-12-01',
            'employee_ids' => [$senior->id, $junior->id, $probation->id],
        ]);

        $response->assertRedirect();

        $thrPayroll = Payroll::query()->where('type', 'thr')->firstOrFail();

        $seniorItem = PayrollItem::query()->where('payroll_id', $thrPayroll->id)->where('user_id', $senior->id)->firstOrFail();
        $juniorItem = PayrollItem::query()->where('payroll_id', $thrPayroll->id)->where('user_id', $junior->id)->firstOrFail();
        $probationItem = PayrollItem::query()->where('payroll_id', $thrPayroll->id)->where('user_id', $probation->id)->firstOrFail();

        $this->assertEquals(10_500_000, (float) $seniorItem->thr_amount);
        $this->assertEquals(10_500_000, (float) $seniorItem->net_salary);

        $this->assertEquals(3_000_000, (float) $juniorItem->thr_amount);
        $this->assertEquals(3_000_000, (float) $juniorItem->net_salary);

        $this->assertEquals(0, (float) $probationItem->thr_amount);
        $this->assertEquals(0, (float) $probationItem->net_salary);
    }
}
