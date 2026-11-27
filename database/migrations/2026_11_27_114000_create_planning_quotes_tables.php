<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('planning_quotes', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('client_number');
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('parent_quote_id')->nullable()->constrained('planning_quotes')->nullOnDelete();
            $table->string('document_kind', 30)->default('main'); // main, addendum, survey_only
            $table->string('client_name');
            $table->string('client_phone', 30)->nullable();
            $table->string('project_title');
            $table->date('quote_date');
            $table->decimal('actual_area', 10, 2)->nullable();
            $table->string('discount_type', 20)->default('none'); // none, percent, fixed
            $table->decimal('discount_value', 12, 2)->default(0);
            $table->unsignedBigInteger('discount_amount')->default(0);
            $table->unsignedBigInteger('survey_fee')->default(0);
            $table->string('survey_mode', 20)->default('excluded'); // excluded, separate_invoice, included
            $table->date('survey_paid_at')->nullable();
            $table->decimal('dp_percent', 5, 2)->default(35);
            $table->decimal('t1_percent', 5, 2)->default(35);
            $table->decimal('t2_percent', 5, 2)->default(30);
            $table->decimal('t3_percent', 5, 2)->default(0);
            $table->decimal('t4_percent', 5, 2)->default(0);
            $table->date('dp_paid_at')->nullable();
            $table->date('t1_paid_at')->nullable();
            $table->date('t2_paid_at')->nullable();
            $table->date('t3_paid_at')->nullable();
            $table->date('t4_paid_at')->nullable();
            $table->unsignedBigInteger('subtotal_amount')->default(0);
            $table->unsignedBigInteger('contract_value')->default(0);
            $table->string('status', 30)->default('follow_up'); // follow_up, progress, done, cancelled
            $table->string('stage_label', 40)->default('PENAWARAN');
            $table->text('intro_notes')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'quote_date']);
        });

        Schema::create('planning_quote_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('planning_quote_id')->constrained('planning_quotes')->cascadeOnDelete();
            $table->string('package_code', 30)->nullable();
            $table->text('description');
            $table->string('unit_type', 10)->default('m2'); // m2, ls
            $table->decimal('quantity', 10, 2)->default(1);
            $table->unsignedBigInteger('unit_price')->default(0);
            $table->unsignedBigInteger('total_price')->default(0);
            $table->string('notes')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });

        // Import 6 existing spreadsheet records on production/local if projects already exist (skip in fresh unit test DBs with 0 users)
        if (DB::table('users')->exists() && ! DB::table('planning_quotes')->exists()) {
            $this->seedInitialSpreadsheetData();
        }
    }

    private function seedInitialSpreadsheetData(): void
    {
        $now = now();
        $findProjectId = function (string $keyword): ?int {
            $id = DB::table('projects')
                ->whereNull('deleted_at')
                ->where(function ($q) use ($keyword): void {
                    $q->where('name', 'like', "%{$keyword}%")
                        ->orWhere('client_name', 'like', "%{$keyword}%");
                })
                ->value('id');

            return $id ? (int) $id : null;
        };

        $rudiProjectId = $findProjectId('Rudy') ?? $findProjectId('Rudi');
        $dedeProjectId = $findProjectId('Dede');

        // 01 - PAK RUDI
        $rudiQuoteId = DB::table('planning_quotes')->insertGetId([
            'client_number' => 1,
            'project_id' => $rudiProjectId,
            'parent_quote_id' => null,
            'document_kind' => 'main',
            'client_name' => 'PAK RUDI',
            'client_phone' => '628119833400',
            'project_title' => 'Home Design, Bogor',
            'quote_date' => '2026-11-10',
            'actual_area' => 144,
            'discount_type' => 'none',
            'discount_value' => 0,
            'discount_amount' => 0,
            'survey_fee' => 0,
            'survey_mode' => 'excluded',
            'dp_percent' => 35,
            't1_percent' => 35,
            't2_percent' => 30,
            't3_percent' => 0,
            't4_percent' => 0,
            'dp_paid_at' => '2026-11-12',
            't1_paid_at' => '2026-11-25',
            'subtotal_amount' => 12960000,
            'contract_value' => 12960000,
            'status' => 'progress',
            'stage_label' => 'TERMIN 1',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('planning_quote_items')->insert([
            'planning_quote_id' => $rudiQuoteId,
            'package_code' => 'PKG-3',
            'description' => "Package 3\n• Denah Layout 2D\n• Visual 3D (Render)\n• Lembar Kerja (DED)\n• Rancangan Anggaran Biaya (RAB)",
            'unit_type' => 'm2',
            'quantity' => 144,
            'unit_price' => 90000,
            'total_price' => 12960000,
            'notes' => 'Paket Utama',
            'order' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // 02 - PAK DEDE SOPIAN
        $dedeQuoteId = DB::table('planning_quotes')->insertGetId([
            'client_number' => 2,
            'project_id' => $dedeProjectId,
            'parent_quote_id' => null,
            'document_kind' => 'main',
            'client_name' => 'PAK DEDE SOPIAN',
            'client_phone' => '6281223988858',
            'project_title' => 'Home Design, Kabupaten Bandung Barat',
            'quote_date' => '2026-11-19',
            'actual_area' => 80,
            'discount_type' => 'none',
            'discount_value' => 0,
            'discount_amount' => 0,
            'survey_fee' => 0,
            'survey_mode' => 'excluded',
            'dp_percent' => 35,
            't1_percent' => 35,
            't2_percent' => 30,
            't3_percent' => 0,
            't4_percent' => 0,
            'dp_paid_at' => '2026-11-23',
            'subtotal_amount' => 8800000,
            'contract_value' => 8800000,
            'status' => 'progress',
            'stage_label' => 'DP',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('planning_quote_items')->insert([
            'planning_quote_id' => $dedeQuoteId,
            'package_code' => 'PRM-01',
            'description' => "Package 2 + RAB (Bonus Promo)\n• Denah Layout 2D\n• Visual 3D (Render)\n• Lembar Kerja (DED)\n• Rancangan Anggaran Biaya (RAB)",
            'unit_type' => 'm2',
            'quantity' => 80,
            'unit_price' => 110000,
            'total_price' => 8800000,
            'notes' => 'Paket Utama',
            'order' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // 03 - PAK HERDI
        $herdiQuoteId = DB::table('planning_quotes')->insertGetId([
            'client_number' => 3,
            'project_id' => null,
            'parent_quote_id' => null,
            'document_kind' => 'main',
            'client_name' => 'PAK HERDI',
            'client_phone' => '6285179797877',
            'project_title' => 'Apotek Design',
            'quote_date' => '2026-11-20',
            'actual_area' => 105,
            'discount_type' => 'percent',
            'discount_value' => 10,
            'discount_amount' => 880000,
            'survey_fee' => 0,
            'survey_mode' => 'excluded',
            'dp_percent' => 35,
            't1_percent' => 35,
            't2_percent' => 30,
            't3_percent' => 0,
            't4_percent' => 0,
            'subtotal_amount' => 8800000,
            'contract_value' => 7920000,
            'status' => 'follow_up',
            'stage_label' => 'PENAWARAN',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('planning_quote_items')->insert([
            'planning_quote_id' => $herdiQuoteId,
            'package_code' => 'PRM-01',
            'description' => "Package 2 + RAB (Bonus Promo)\n• Denah Layout 2D\n• Visual 3D (Render)\n• Lembar Kerja (DED)\n• Rancangan Anggaran Biaya (RAB)",
            'unit_type' => 'm2',
            'quantity' => 80,
            'unit_price' => 110000,
            'total_price' => 8800000,
            'notes' => 'Paket Utama',
            'order' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // 04 - IBU STEVIA
        $steviaQuoteId = DB::table('planning_quotes')->insertGetId([
            'client_number' => 4,
            'project_id' => null,
            'parent_quote_id' => null,
            'document_kind' => 'main',
            'client_name' => 'IBU STEVIA',
            'client_phone' => '6287824998986',
            'project_title' => 'Home Design, Kota Bandung',
            'quote_date' => '2026-11-23',
            'actual_area' => 182,
            'discount_type' => 'none',
            'discount_value' => 0,
            'discount_amount' => 0,
            'survey_fee' => 0,
            'survey_mode' => 'excluded',
            'dp_percent' => 35,
            't1_percent' => 35,
            't2_percent' => 30,
            't3_percent' => 0,
            't4_percent' => 0,
            'subtotal_amount' => 20020000,
            'contract_value' => 20020000,
            'status' => 'follow_up',
            'stage_label' => 'PENAWARAN',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('planning_quote_items')->insert([
            'planning_quote_id' => $steviaQuoteId,
            'package_code' => 'PRM-01',
            'description' => "Package 2 + RAB (Bonus Promo)\n• Denah Layout 2D\n• Visual 3D (Render)\n• Lembar Kerja (DED)\n• Rancangan Anggaran Biaya (RAB)",
            'unit_type' => 'm2',
            'quantity' => 182,
            'unit_price' => 110000,
            'total_price' => 20020000,
            'notes' => 'Paket Utama',
            'order' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // 05 - PAK RUDI 2 (Adendum of PAK RUDI)
        $rudiAddendumId = DB::table('planning_quotes')->insertGetId([
            'client_number' => 5,
            'project_id' => $rudiProjectId,
            'parent_quote_id' => $rudiQuoteId,
            'document_kind' => 'addendum',
            'client_name' => 'PAK RUDI',
            'client_phone' => '628119833400',
            'project_title' => 'Home Design, Bogor (Adendum Exterior)',
            'quote_date' => '2026-11-23',
            'actual_area' => 12,
            'discount_type' => 'none',
            'discount_value' => 0,
            'discount_amount' => 0,
            'survey_fee' => 0,
            'survey_mode' => 'excluded',
            'dp_percent' => 100,
            't1_percent' => 0,
            't2_percent' => 0,
            't3_percent' => 0,
            't4_percent' => 0,
            'subtotal_amount' => 2000000,
            'contract_value' => 2000000,
            'status' => 'follow_up',
            'stage_label' => 'PENAWARAN',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('planning_quote_items')->insert([
            'planning_quote_id' => $rudiAddendumId,
            'package_code' => 'ADN-01',
            'description' => "Pengerjaan Adendum Desain (Exterior)\n• Denah Layout 2D\n• Visual 3D (Render)\n• Lembar Kerja (DED)\n• Rancangan Anggaran Biaya (RAB)\n• Desain Pengerjaan Atap",
            'unit_type' => 'ls',
            'quantity' => 1,
            'unit_price' => 2000000,
            'total_price' => 2000000,
            'notes' => 'Adendum Perubahan Kerja',
            'order' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // 06 - IBU ALIFIA
        $alifiaQuoteId = DB::table('planning_quotes')->insertGetId([
            'client_number' => 6,
            'project_id' => null,
            'parent_quote_id' => null,
            'document_kind' => 'main',
            'client_name' => 'IBU ALIFIA',
            'client_phone' => '6287888729686',
            'project_title' => 'Interior Design, Kota Bandung',
            'quote_date' => '2026-11-24',
            'actual_area' => 12,
            'discount_type' => 'none',
            'discount_value' => 0,
            'discount_amount' => 0,
            'survey_fee' => 0,
            'survey_mode' => 'excluded',
            'dp_percent' => 35,
            't1_percent' => 35,
            't2_percent' => 30,
            't3_percent' => 0,
            't4_percent' => 0,
            'subtotal_amount' => 3000000,
            'contract_value' => 3000000,
            'status' => 'follow_up',
            'stage_label' => 'PENAWARAN',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('planning_quote_items')->insert([
            'planning_quote_id' => $alifiaQuoteId,
            'package_code' => 'INT-01',
            'description' => "Package Interior Design\n• Denah Layout 2D\n• Visual 3D (Render)\n• Lembar Kerja (DED)\n• Rancangan Anggaran Biaya (RAB)",
            'unit_type' => 'm2',
            'quantity' => 30,
            'unit_price' => 100000,
            'total_price' => 3000000,
            'notes' => 'Minimum Order 30 m²',
            'order' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('planning_quote_items');
        Schema::dropIfExists('planning_quotes');
    }
};
