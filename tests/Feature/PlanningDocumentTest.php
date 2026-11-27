<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\PlanningQuote;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanningDocumentTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_admin_perencanaan_can_access_planning_documents(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $adminProject = User::factory()->create(['name' => 'Rindi Admin Project']);
        Employee::factory()->create([
            'user_id' => $adminProject->id,
            'position' => 'Admin Project',
            'department' => 'Administrasi',
        ]);
        $drafter = User::factory()->create(['name' => 'Drafter Biasa']);
        Employee::factory()->create([
            'user_id' => $drafter->id,
            'position' => 'Drafter',
            'department' => 'Perencanaan',
        ]);

        $this->actingAs($superAdmin)->get(route('planning-documents.index'))->assertOk();
        $this->actingAs($adminProject)->get(route('planning-documents.index'))->assertOk();
        $this->actingAs($drafter)->get(route('planning-documents.index'))->assertForbidden();
    }

    public function test_admin_can_create_quotation_addendum_survey_invoice_convert_project_and_download_pdfs(): void
    {
        $admin = User::factory()->admin()->create();

        // 1. Create Main Quotation with 10% discount
        $this->actingAs($admin)
            ->post(route('planning-documents.store'), [
                'document_kind' => 'main',
                'client_name' => 'PAK HERDI',
                'client_phone' => '6285179797877',
                'project_title' => 'Apotek Design',
                'quote_date' => '2026-11-20',
                'actual_area' => 105,
                'discount_type' => 'percent',
                'discount_value' => 10,
                'survey_fee' => 500000,
                'survey_mode' => 'separate_invoice',
                'dp_percent' => 35,
                't1_percent' => 35,
                't2_percent' => 30,
                'items' => [
                    [
                        'package_code' => 'PRM-01',
                        'description' => 'Package 2 + RAB (Bonus Promo)',
                        'unit_type' => 'm2',
                        'quantity' => 80,
                        'unit_price' => 110000,
                    ],
                ],
            ])
            ->assertRedirect();

        $quote = PlanningQuote::query()->where('client_name', 'PAK HERDI')->firstOrFail();
        $this->assertSame(8800000, $quote->subtotal_amount);
        $this->assertSame(880000, $quote->discount_amount);
        $this->assertSame(7920000, $quote->contract_value);
        $this->assertSame('001/SP-RIM/XI/2026', $quote->documentNumber('SP'));

        // While status is still follow_up (Belum Deal), it MUST NOT be included in total_contract KPI
        $this->actingAs($admin)
            ->get(route('planning-documents.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('metrics.total_contract', 0)
                ->where('metrics.deal_count', 0)
                ->where('metrics.follow_up_count', 1)
                ->where('metrics.follow_up_potential', 8420000));

        // 2. Record separate survey payment + DP payment -> now Deal (progress), enters total_contract KPI
        $this->actingAs($admin)
            ->patch(route('planning-documents.payments', $quote), [
                'survey_paid_at' => '2026-11-21',
                'dp_paid_at' => '2026-11-22',
            ])
            ->assertRedirect();

        $quote->refresh();
        $this->assertSame('DP', $quote->stage_label);
        $this->assertSame('progress', $quote->status);

        $this->actingAs($admin)
            ->get(route('planning-documents.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('metrics.total_contract', 8420000)
                ->where('metrics.deal_count', 1)
                ->where('metrics.follow_up_count', 0));

        // 3. Download Quotation PDF, Survey Invoice PDF, DP Receipt PDF
        $spPdf = $this->actingAs($admin)->get(route('planning-documents.pdf.quotation', $quote));
        $spPdf->assertOk();
        $this->assertStringStartsWith('%PDF-', $spPdf->getContent());

        $invPdf = $this->actingAs($admin)->get(route('planning-documents.pdf.invoice', [$quote, 'survey']));
        $invPdf->assertOk();
        $this->assertStringStartsWith('%PDF-', $invPdf->getContent());

        $kwiPdf = $this->actingAs($admin)->get(route('planning-documents.pdf.receipt', [$quote, 'dp']));
        $kwiPdf->assertOk();
        $this->assertStringStartsWith('%PDF-', $kwiPdf->getContent());

        // 4. Convert Quotation -> Planning Project (syncs package, area, budget)
        $this->actingAs($admin)
            ->post(route('planning-documents.convert-project', $quote))
            ->assertRedirect();

        $quote->refresh();
        $this->assertNotNull($quote->project_id);
        $project = Project::query()->findOrFail($quote->project_id);
        $this->assertSame('perencanaan', $project->project_type);
        $this->assertSame(7920000, $project->estimated_budget);

        // 5. Terbilang check
        $this->assertSame(
            'Empat Juta Lima Ratus Tiga Puluh Enam Ribu Rupiah',
            PlanningQuote::terbilang(4536000),
        );
    }

    public function test_floor_breakdown_included_survey_upfront_and_agreed_contract_value(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post(route('planning-documents.store'), [
                'document_kind' => 'main',
                'client_name' => 'PAK BANGUN',
                'client_phone' => '081271227902',
                'project_title' => 'Home Design - Jakarta Barat',
                'quote_date' => '2026-11-27',
                'floor_breakdown' => [
                    ['label' => 'Lantai 1', 'area' => 90],
                    ['label' => 'Lantai 2', 'area' => 90],
                    ['label' => 'Lantai 3 / Rooftop', 'area' => 36],
                ],
                'agreed_contract_value' => 20000000,
                'discount_type' => 'none',
                'discount_value' => 0,
                'survey_fee' => 1800000,
                'survey_mode' => 'included',
                'dp_percent' => 35,
                't1_percent' => 35,
                't2_percent' => 30,
                'status' => 'progress',
                'items' => [
                    [
                        'package_code' => 'PRM-01',
                        'description' => 'Package 2 + RAB (Bonus Promo)',
                        'unit_type' => 'm2',
                        'quantity' => 216,
                        'unit_price' => 110000,
                    ],
                ],
            ])
            ->assertRedirect();

        $quote = PlanningQuote::query()->where('client_name', 'PAK BANGUN')->firstOrFail();

        // Floor breakdown auto-sums into actual_area (90 + 90 + 36 = 216)
        $this->assertEquals(216.0, (float) $quote->actual_area);
        $this->assertCount(3, $quote->floor_breakdown ?? []);

        // Original subtotal = 216 * 110,000 = 23,760,000, but agreed_contract_value = 20,000,000
        $this->assertSame(23760000, $quote->subtotal_amount);
        $this->assertSame(20000000, $quote->agreed_contract_value);
        $this->assertSame(20000000, $quote->effectiveDesignValue());
        $this->assertSame(21800000, $quote->totalBillable());

        // Payment stages: Survey (1,800,000) MUST be Stage #1 BEFORE DP (35% of 20M = 7M)
        $stages = $quote->paymentStages();
        $this->assertSame('survey', $stages[0]['key']);
        $this->assertSame(1800000, $stages[0]['amount']);
        $this->assertSame('dp', $stages[1]['key']);
        $this->assertSame(7000000, $stages[1]['amount']);
        $this->assertSame('t1', $stages[2]['key']);
        $this->assertSame(7000000, $stages[2]['amount']);
        $this->assertSame('t2', $stages[3]['key']);
        $this->assertSame(6000000, $stages[3]['amount']);

        // Quotation PDF with included survey & floor breakdown renders cleanly
        $spPdf = $this->actingAs($admin)->get(route('planning-documents.pdf.quotation', $quote));
        $spPdf->assertOk();
        $this->assertStringStartsWith('%PDF-', $spPdf->getContent());

        // Convert to Planning Project uses agreed_contract_value (20,000,000)
        $this->actingAs($admin)
            ->post(route('planning-documents.convert-project', $quote))
            ->assertRedirect();

        $quote->refresh();
        $project = Project::query()->findOrFail($quote->project_id);
        $this->assertSame(20000000, $project->estimated_budget);
    }

    public function test_custom_fixed_rupiah_payment_scheme(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post(route('planning-documents.store'), [
                'document_kind' => 'main',
                'client_name' => 'IBU RINA',
                'project_title' => 'Rumah Tinggal + Add-On Interior',
                'quote_date' => '2026-11-27',
                'payment_scheme_mode' => 'fixed',
                'dp_amount' => 5000000,
                't1_amount' => 8000000,
                't2_amount' => 7000000,
                'agreed_contract_value' => 20000000,
                'status' => 'progress',
                'items' => [
                    [
                        'package_code' => 'PKG-2',
                        'description' => 'Paket 2',
                        'unit_type' => 'm2',
                        'quantity' => 150,
                        'unit_price' => 110000,
                    ],
                    [
                        'package_code' => 'ADDON-INT',
                        'description' => 'Add-On Interior Design',
                        'unit_type' => 'm2',
                        'quantity' => 150,
                        'unit_price' => 20000,
                    ],
                ],
            ])
            ->assertRedirect();

        $quote = PlanningQuote::query()->where('client_name', 'IBU RINA')->firstOrFail();
        $this->assertSame('fixed', $quote->payment_scheme_mode);

        $stages = $quote->paymentStages();
        $this->assertCount(3, $stages);
        $this->assertSame('Down Payment', $stages[0]['label']);
        $this->assertSame(5000000, $stages[0]['amount']);
        $this->assertSame('Termin 1', $stages[1]['label']);
        $this->assertSame(8000000, $stages[1]['amount']);
        $this->assertSame('Termin 2', $stages[2]['label']);
        $this->assertSame(7000000, $stages[2]['amount']);

        // Record DP paid -> paidTotal should be exactly 5,000,000
        $this->actingAs($admin)
            ->patch(route('planning-documents.payments', $quote), [
                'dp_paid_at' => '2026-11-27',
            ])
            ->assertRedirect();

        $quote->refresh();
        $this->assertSame(5000000, $quote->paidTotal());

        $invPdf = $this->actingAs($admin)->get(route('planning-documents.pdf.invoice', [$quote, 'dp']));
        $invPdf->assertOk();
        $this->assertStringStartsWith('%PDF-', $invPdf->getContent());
    }
}
