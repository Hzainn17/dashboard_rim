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
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('date');
            $table->enum('mode', ['office', 'site_visit'])->default('office');
            $table->boolean('is_weekend')->default(false);
            $table->enum('compensation_type', ['none', 'overtime', 'day_off_exchange'])->default('none');
            $table->date('exchange_date')->nullable();
            $table->enum('compensation_status', ['none', 'pending', 'approved', 'rejected'])->default('none');
            $table->timestamp('check_in_at')->nullable();
            $table->timestamp('check_out_at')->nullable();
            $table->decimal('check_in_lat', 10, 7)->nullable();
            $table->decimal('check_in_lng', 10, 7)->nullable();
            $table->decimal('check_out_lat', 10, 7)->nullable();
            $table->decimal('check_out_lng', 10, 7)->nullable();
            $table->integer('check_in_distance_meters')->nullable();
            $table->integer('target_work_minutes')->default(540);
            $table->integer('actual_work_minutes')->nullable();
            $table->integer('shortage_minutes')->default(0);
            $table->enum('status', ['hadir', 'kurang_jam', 'izin', 'sakit', 'cuti', 'alpha', 'site_visit', 'ganti_hari'])->default('hadir');
            $table->foreignId('site_visit_project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('site_visit_photo_url')->nullable();
            $table->enum('site_visit_status', ['none', 'pending', 'approved', 'rejected'])->default('none');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'date']);
            $table->index(['date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
