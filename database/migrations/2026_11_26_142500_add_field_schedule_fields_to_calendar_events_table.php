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
        Schema::table('calendar_events', function (Blueprint $table): void {
            $table->string('type', 40)->default('meeting')->change();
            $table->json('checklist_items')->nullable()->after('description');
            $table->boolean('is_completed')->default(false)->after('is_all_day');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('calendar_events', function (Blueprint $table): void {
            $table->dropColumn(['checklist_items', 'is_completed']);
        });
    }
};
