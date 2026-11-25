<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasTable('attendances')) {
            return;
        }

        $userIds = DB::table('users')
            ->where('name', 'like', '%Dendi Agung%')
            ->orWhere('name', 'like', '%Reza Hardi%')
            ->pluck('id');

        if ($userIds->isNotEmpty()) {
            DB::table('attendances')
                ->whereIn('user_id', $userIds)
                ->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Deleted attendance records cannot be restored.
    }
};
