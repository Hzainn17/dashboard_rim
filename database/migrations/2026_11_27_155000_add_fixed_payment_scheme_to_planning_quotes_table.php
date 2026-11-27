<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planning_quotes', function (Blueprint $table) {
            $table->string('payment_scheme_mode', 16)->default('percent')->after('survey_paid_at');
            $table->unsignedBigInteger('dp_amount')->nullable()->after('t4_percent');
            $table->unsignedBigInteger('t1_amount')->nullable()->after('dp_amount');
            $table->unsignedBigInteger('t2_amount')->nullable()->after('t1_amount');
            $table->unsignedBigInteger('t3_amount')->nullable()->after('t2_amount');
            $table->unsignedBigInteger('t4_amount')->nullable()->after('t3_amount');
        });
    }

    public function down(): void
    {
        Schema::table('planning_quotes', function (Blueprint $table) {
            $table->dropColumn([
                'payment_scheme_mode',
                'dp_amount',
                't1_amount',
                't2_amount',
                't3_amount',
                't4_amount',
            ]);
        });
    }
};
