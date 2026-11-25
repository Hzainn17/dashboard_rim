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
        Schema::table('projects', function (Blueprint $table): void {
            $table->string('maps_url', 500)->nullable()->after('location');
        });

        // Clean existing projects that have raw Google Maps URLs pasted inside location
        $projectsWithUrl = DB::table('projects')
            ->whereNotNull('location')
            ->where('location', 'like', '%http%')
            ->get(['id', 'location', 'maps_url']);

        foreach ($projectsWithUrl as $row) {
            if (preg_match('~(https?://\S+)~i', (string) $row->location, $matches)) {
                $extractedUrl = rtrim($matches[1], '.,;)');
                $cleanLocation = trim((string) preg_replace('~https?://\S+~i', '', (string) $row->location));
                $cleanLocation = trim($cleanLocation, " \t\n\r\0\x0B,-|");

                DB::table('projects')
                    ->where('id', $row->id)
                    ->update([
                        'location' => $cleanLocation !== '' ? $cleanLocation : 'Titik Lokasi Google Maps',
                        'maps_url' => $row->maps_url ?: $extractedUrl,
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->dropColumn('maps_url');
        });
    }
};
