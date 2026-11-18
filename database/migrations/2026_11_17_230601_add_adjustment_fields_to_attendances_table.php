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
        Schema::table('attendances', function (Blueprint $table) {
            $table->boolean('is_auto_closed')->default(false)->after('status');
            $table->enum('adjustment_type', ['none', 'check_in', 'check_out', 'full_day'])->default('none')->after('is_auto_closed');
            $table->enum('adjustment_status', ['none', 'pending', 'approved', 'rejected'])->default('none')->after('adjustment_type');
            $table->timestamp('adjusted_check_in_at')->nullable()->after('adjustment_status');
            $table->timestamp('adjusted_check_out_at')->nullable()->after('adjusted_check_in_at');
            $table->text('adjustment_reason')->nullable()->after('adjusted_check_out_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn([
                'is_auto_closed',
                'adjustment_type',
                'adjustment_status',
                'adjusted_check_in_at',
                'adjusted_check_out_at',
                'adjustment_reason',
            ]);
        });
    }
};
