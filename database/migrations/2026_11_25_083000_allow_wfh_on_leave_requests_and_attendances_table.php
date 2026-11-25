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
        Schema::table('leave_requests', function (Blueprint $table): void {
            $table->string('type', 30)->change();
        });

        Schema::table('attendances', function (Blueprint $table): void {
            $table->string('mode', 30)->default('office')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep string columns to avoid losing 'wfh' rows on rollback.
    }
};
