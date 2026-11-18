<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payrolls', function (Blueprint $table): void {
            $table->enum('type', ['regular', 'thr'])->default('regular')->after('period_name');
            $table->date('thr_reference_date')->nullable()->after('end_date');

            $table->dropUnique(['period_month', 'period_year']);
            $table->unique(['type', 'period_month', 'period_year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payrolls', function (Blueprint $table): void {
            $table->dropUnique(['type', 'period_month', 'period_year']);
            $table->unique(['period_month', 'period_year']);
            $table->dropColumn(['type', 'thr_reference_date']);
        });
    }
};
