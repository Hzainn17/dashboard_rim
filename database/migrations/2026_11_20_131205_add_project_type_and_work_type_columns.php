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
        Schema::table('projects', function (Blueprint $table): void {
            $table->string('project_type', 30)->default('perencanaan')->after('package_name');
        });

        Schema::table('employees', function (Blueprint $table): void {
            $table->string('work_type', 20)->default('kantor')->after('department');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->dropColumn('project_type');
        });

        Schema::table('employees', function (Blueprint $table): void {
            $table->dropColumn('work_type');
        });
    }
};
