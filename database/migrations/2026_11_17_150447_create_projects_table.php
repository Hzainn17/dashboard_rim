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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('client_name');
            $table->string('client_phone', 20)->nullable();
            $table->string('location')->nullable();
            $table->string('category', 50)->nullable();
            $table->string('cover_image_url')->nullable();
            $table->string('drive_url')->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['planning', 'ongoing', 'review', 'done', 'on_hold'])->default('planning');
            $table->integer('progress_percent')->default(0);
            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            $table->foreignId('owner_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
