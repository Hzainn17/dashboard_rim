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
            $table->string('employment_status', 30)->default('tetap')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep string column to avoid losing 'freelance' rows on rollback.
    }
};
