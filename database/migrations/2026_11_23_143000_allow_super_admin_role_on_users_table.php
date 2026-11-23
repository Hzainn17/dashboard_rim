<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('role', 30)->default('employee')->change();
        });

        // Promote initial primary studio admin account to super_admin if none exists yet
        if (! DB::table('users')->where('role', 'super_admin')->exists()) {
            $primaryAdminId = DB::table('users')
                ->where('email', 'admin@rimstudio.com')
                ->value('id')
                ?? DB::table('users')
                    ->where('role', 'admin')
                    ->orderBy('id')
                    ->value('id');

            if ($primaryAdminId) {
                DB::table('users')
                    ->where('id', $primaryAdminId)
                    ->update(['role' => 'super_admin']);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep string column to avoid losing 'super_admin' rows on rollback.
    }
};
