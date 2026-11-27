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
        Schema::table('planning_quotes', function (Blueprint $table): void {
            $table->json('floor_breakdown')->nullable()->after('actual_area');
            $table->unsignedBigInteger('agreed_contract_value')->nullable()->after('contract_value');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('planning_quotes', function (Blueprint $table): void {
            $table->dropColumn(['floor_breakdown', 'agreed_contract_value']);
        });
    }
};
