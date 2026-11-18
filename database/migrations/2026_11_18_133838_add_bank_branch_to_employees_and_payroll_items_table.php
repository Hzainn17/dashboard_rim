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
        Schema::table('employees', function (Blueprint $table): void {
            $table->string('bank_branch')->nullable()->after('bank_account_holder');
        });

        Schema::table('payroll_items', function (Blueprint $table): void {
            $table->string('bank_branch')->nullable()->after('bank_account_holder');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->dropColumn('bank_branch');
        });

        Schema::table('payroll_items', function (Blueprint $table): void {
            $table->dropColumn('bank_branch');
        });
    }
};
