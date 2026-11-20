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
        Schema::table('projects', function (Blueprint $table) {
            $table->string('package_name')->nullable()->after('category');
            $table->json('package_addons')->nullable()->after('package_name');
            $table->decimal('building_area', 8, 2)->nullable()->after('package_addons');
            $table->unsignedBigInteger('estimated_budget')->nullable()->after('building_area');
            $table->text('custom_scope_notes')->nullable()->after('estimated_budget');
        });

        Schema::table('project_stages', function (Blueprint $table) {
            $table->date('update_design_date')->nullable()->after('status');
            $table->date('client_response_date')->nullable()->after('update_design_date');
            $table->text('output_notes')->nullable()->after('client_response_date');
            $table->integer('duration_workdays')->nullable()->after('output_notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn([
                'package_name',
                'package_addons',
                'building_area',
                'estimated_budget',
                'custom_scope_notes',
            ]);
        });

        Schema::table('project_stages', function (Blueprint $table) {
            $table->dropColumn([
                'update_design_date',
                'client_response_date',
                'output_notes',
                'duration_workdays',
            ]);
        });
    }
};
