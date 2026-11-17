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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('employee_code', 20)->unique();
            $table->string('position');
            $table->string('department')->nullable();
            $table->date('join_date');
            $table->decimal('base_salary', 15, 2)->default(0);
            $table->decimal('fixed_allowance', 15, 2)->default(0);
            $table->decimal('overtime_rate_per_hour', 15, 2)->default(0);
            $table->string('bank_name', 50)->nullable();
            $table->string('bank_account_number', 30)->nullable();
            $table->string('bank_account_holder')->nullable();
            $table->integer('annual_leave_quota')->default(12);
            $table->enum('employment_status', ['tetap', 'kontrak', 'magang'])->default('tetap');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
