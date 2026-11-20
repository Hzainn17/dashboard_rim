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
        Schema::create('login_portfolios', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('category')->nullable();
            $table->string('location')->nullable();
            $table->text('caption')->nullable();
            $table->string('image_url');
            $table->integer('sort_order')->default(1);
            $table->timestamps();
        });

        DB::table('login_portfolios')->insert([
            [
                'title' => 'Villa Kayu & Batu Alam Lembang',
                'category' => 'Residensial & Resort',
                'location' => 'Bandung Barat, Jawa Barat',
                'caption' => 'Harmoni arsitektur tropis modern dengan bukaan alami dan material lokal.',
                'image_url' => '/project-covers/villa-lembang.png',
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Rumah Tropis Kontemporer',
                'category' => 'Hunian Privat',
                'location' => 'Jakarta Selatan',
                'caption' => 'Sirkulasi silang optimal dengan tata cahaya alami sepanjang hari.',
                'image_url' => '/project-covers/rumah-tropis.png',
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Gedung Kantor & Ruang Komersial',
                'category' => 'Komersial & Perkantoran',
                'location' => 'SCBD Sudirman, Jakarta',
                'caption' => 'Fasad kaca berlapis kisi aluminium untuk efisiensi energi maksimal.',
                'image_url' => '/project-covers/kantor-sudirman.png',
                'sort_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Interior Kafe & Ruang Kolaborasi',
                'category' => 'Desain Interior',
                'location' => 'Kemang, Jakarta Selatan',
                'caption' => 'Nuansa hangat kayu alami berpadu pencahayaan ambient yang intim.',
                'image_url' => '/project-covers/interior-kafe.png',
                'sort_order' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('login_portfolios');
    }
};
