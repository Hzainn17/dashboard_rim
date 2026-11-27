<?php

namespace App\Services;

use Illuminate\Support\Carbon;

class ProjectPackageService
{
    /**
     * Official RIM Projects Pricelist packages.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function packages(): array
    {
        return [
            [
                'id' => 'Paket 1',
                'name' => 'Paket 1',
                'price_per_m2' => 70000,
                'min_area' => 80,
                'tagline' => 'Denah Layout + Design 3D Visual',
                'deliverables' => [
                    'Denah Layout',
                    'Design 3D Visual',
                ],
                'default_stages' => [
                    'Tahap Konseptual V1',
                    'Tahap Konseptual V2',
                    'Tahap Pengembangan V1',
                    'Tahap Pengembangan V2',
                ],
            ],
            [
                'id' => 'Paket 2',
                'name' => 'Paket 2',
                'price_per_m2' => 110000,
                'min_area' => 80,
                'tagline' => 'Denah Layout + 3D Visual + DED',
                'deliverables' => [
                    'Denah Layout',
                    'Design 3D Visual',
                    'Lembar Kerja (DED)',
                ],
                'default_stages' => [
                    'Tahap Konseptual V1',
                    'Tahap Konseptual V2',
                    'Tahap Pengembangan V1',
                    'Tahap Pengembangan V2',
                    'DED',
                ],
            ],
            [
                'id' => 'Paket 3',
                'name' => 'Paket 3',
                'price_per_m2' => 140000,
                'min_area' => 80,
                'tagline' => 'Lengkap: Layout, 3D Visual, DED, RAB + Free Hard Box',
                'deliverables' => [
                    'Denah Layout',
                    'Design 3D Visual',
                    'Lembar Kerja (DED)',
                    'RAB',
                    'Free Hard Box (Printed Out, Flashdisk, Merchandise)',
                ],
                'default_stages' => [
                    'Tahap Konseptual V1',
                    'Tahap Konseptual V2',
                    'Tahap Pengembangan V1',
                    'Tahap Pengembangan V2',
                    'DED',
                    'RAB',
                ],
            ],
            [
                'id' => 'Interior Design Package',
                'name' => 'Interior Design Package',
                'price_per_m2' => 100000,
                'min_area' => 30,
                'tagline' => 'Denah, 3D Visual, DED & RAB Interior',
                'deliverables' => [
                    'Denah Layout Interior',
                    'Design 3D Visual Interior',
                    'Lembar Kerja (DED) Interior',
                    'RAB Interior',
                ],
                'default_stages' => [
                    'Tahap Konseptual V1',
                    'Tahap Konseptual V2',
                    'Tahap Pengembangan V1',
                    'Tahap Pengembangan V2',
                    'DED',
                    'RAB',
                ],
            ],
            [
                'id' => 'Custom / Khusus',
                'name' => 'Custom / Khusus',
                'price_per_m2' => 0,
                'min_area' => 0,
                'tagline' => 'Layanan & lingkup kerja disesuaikan kebutuhan klien',
                'deliverables' => [],
                'default_stages' => [
                    'Tahap Konseptual V1',
                    'Tahap Konseptual V2',
                    'Tahap Pengembangan V1',
                    'Tahap Pengembangan V2',
                ],
            ],
        ];
    }

    /**
     * Standard available add-ons from pricelist.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function addons(): array
    {
        return [
            [
                'id' => 'Add-On Interior Design',
                'label' => 'Add-On Interior Design (+Rp 20.000/m²)',
                'price_per_m2' => 20000,
            ],
            [
                'id' => 'Pembangunan by RIM Team',
                'label' => 'Pembangunan by RIM Projects Team (Diskon Desain 50%)',
                'price_per_m2' => 0,
            ],
            [
                'id' => 'Pengawasan Lapangan',
                'label' => 'Pengawasan / Supervisi Lapangan Berkala',
                'price_per_m2' => 0,
            ],
            [
                'id' => 'Free Hard Box & Merchandise',
                'label' => 'Hard Box, Draft Printed Out & Flashdisk',
                'price_per_m2' => 0,
            ],
        ];
    }

    /**
     * Default stage metadata matching RIM Projects official timeline document.
     *
     * @return array<string, array{workdays: int, output: string}>
     */
    public static function stageTemplates(): array
    {
        return [
            'Tahap Konseptual V1' => [
                'workdays' => 7,
                'output' => 'Tata Letak & Fungsi Ruang: Menentukan pembagian area dan alur gerak (sirkulasi) antar-ruang agar fungsional dan nyaman. Bentuk Massa Bangunan: Merancang wujud arsitektur, tampak luar, dan proporsi bangunan.',
            ],
            'Tahap Konseptual V2' => [
                'workdays' => 3,
                'output' => 'Revisi & penyempurnaan tata letak ruang serta bentuk massa bangunan berdasarkan masukan pemilik rumah.',
            ],
            'Tahap Pengembangan V1' => [
                'workdays' => 7,
                'output' => 'Desain Fasad: Mematangkan tampilan luar atau wajah bangunan. Material & Warna: Menentukan finishing dinding, lantai, serta palet warna cat. Desain Interior & Suasana Ruang: Gambaran visual suasana ruang.',
            ],
            'Tahap Pengembangan V2' => [
                'workdays' => 3,
                'output' => 'Revisi & finalisasi desain fasad, material, warna, dan visualisasi 3D.',
            ],
            'DED' => [
                'workdays' => 7,
                'output' => 'Gambar kerja teknis yang menjadi panduan detail ukuran, material, hingga detail konstruksi bagi kontraktor saat pelaksanaan di lapangan.',
            ],
            'RAB' => [
                'workdays' => 7,
                'output' => 'Rancangan Anggaran Biaya (RAB): Perhitungan estimasi biaya pembangunan berdasarkan kebutuhan material, volume pekerjaan, dan harga satuan.',
            ],
        ];
    }

    /**
     * Build stages with calculated target dates based on start_date.
     *
     * @param  array<int, string>  $stageNames
     * @return array<int, array<string, mixed>>
     */
    public static function buildStagesWithTimeline(Carbon $startDate, array $stageNames): array
    {
        $templates = self::stageTemplates();
        $cursor = $startDate->copy();
        $result = [];

        foreach (array_values($stageNames) as $index => $name) {
            $cleanName = trim($name);
            if ($cleanName === '') {
                continue;
            }

            $template = $templates[$cleanName] ?? [
                'workdays' => 5,
                'output' => 'Deliverables & asistensi tahapan '.$cleanName,
            ];

            $workdays = $template['workdays'];
            $updateDesignDate = self::addWorkdays($cursor, $workdays);
            $clientResponseDate = $updateDesignDate->copy()->addDays(3);

            $result[] = [
                'name' => $cleanName,
                'order' => $index + 1,
                'status' => $index === 0 ? 'active' : 'pending',
                'update_design_date' => $updateDesignDate->format('Y-m-d'),
                'client_response_date' => $clientResponseDate->format('Y-m-d'),
                'output_notes' => $template['output'],
                'duration_workdays' => $workdays,
            ];

            $cursor = $clientResponseDate->copy();
        }

        return $result;
    }

    /**
     * Commercial pricelist catalog synced with Planning Projects packages + Add-Ons + Promo / Addendum items.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function commercialPricelist(): array
    {
        $basePackages = self::packages();
        $codeMap = [
            'Paket 1' => 'PKG-1',
            'Paket 2' => 'PKG-2',
            'Paket 3' => 'PKG-3',
            'Interior Design Package' => 'INT-01',
            'Custom / Khusus' => 'CUSTOM',
        ];

        $catalog = [];
        foreach ($basePackages as $pkg) {
            $bullets = collect($pkg['deliverables'] ?? [])
                ->map(fn (string $d): string => "• {$d}")
                ->implode("\n");

            $catalog[] = [
                'code' => $codeMap[$pkg['id']] ?? 'CUSTOM',
                'category' => 'package',
                'project_package_id' => $pkg['id'],
                'addon_id' => null,
                'name' => $pkg['name'],
                'default_description' => $bullets !== '' ? "{$pkg['name']}\n{$bullets}" : $pkg['name'],
                'unit_type' => $pkg['id'] === 'Custom / Khusus' ? 'ls' : 'm2',
                'price_per_m2' => (int) $pkg['price_per_m2'],
                'min_area' => (int) $pkg['min_area'],
            ];
        }

        // Official Add-Ons synced directly from ProjectPackageService::addons()
        $addonCodeMap = [
            'Add-On Interior Design' => [
                'code' => 'ADDON-INT',
                'unit_type' => 'm2',
                'description' => "Add-On Interior Design\n• Penambahan lingkup desain interior (Denah, Visual 3D & DED Interior)",
            ],
            'Pengawasan Lapangan' => [
                'code' => 'ADDON-SUP',
                'unit_type' => 'ls',
                'description' => "Add-On Pengawasan / Supervisi Lapangan Berkala\n• Kunjungan & pengecekan kesesuaian pekerjaan di lapangan",
            ],
            'Free Hard Box & Merchandise' => [
                'code' => 'ADDON-BOX',
                'unit_type' => 'ls',
                'description' => "Add-On Hard Box & Merchandise\n• Hard Box Eksklusif, Draft Printed Out & Flashdisk",
            ],
        ];

        foreach (self::addons() as $addon) {
            $meta = $addonCodeMap[$addon['id']] ?? null;
            if (! $meta) {
                continue;
            }

            $catalog[] = [
                'code' => $meta['code'],
                'category' => 'addon',
                'project_package_id' => 'Custom / Khusus',
                'addon_id' => $addon['id'],
                'name' => $addon['label'],
                'default_description' => $meta['description'],
                'unit_type' => $meta['unit_type'],
                'price_per_m2' => (int) ($addon['price_per_m2'] ?? 0),
                'min_area' => 0,
            ];
        }

        // Additional commercial templates (Promo & Addendum — freely editable per quote)
        $catalog[] = [
            'code' => 'PRM-01',
            'category' => 'commercial',
            'project_package_id' => 'Paket 2',
            'addon_id' => null,
            'name' => 'Paket 2 + RAB (Bonus Promo)',
            'default_description' => "Paket 2 + RAB (Bonus Promo)\n• Denah Layout\n• Design 3D Visual\n• Lembar Kerja (DED)\n• RAB (Bonus Promo)",
            'unit_type' => 'm2',
            'price_per_m2' => 110000,
            'min_area' => 80,
        ];
        $catalog[] = [
            'code' => 'ADN-01',
            'category' => 'commercial',
            'project_package_id' => 'Custom / Khusus',
            'addon_id' => null,
            'name' => 'Adendum Desain / Pekerjaan Tambahan',
            'default_description' => "Pengerjaan Adendum Desain (Perubahan / Tambahan Kerja)\n• Revisi Denah Layout\n• Visual 3D (Render)\n• Penyesuaian Lembar Kerja (DED) & RAB",
            'unit_type' => 'ls',
            'price_per_m2' => 0,
            'min_area' => 0,
        ];

        return $catalog;
    }

    /**
     * Add N workdays (skipping Saturday & Sunday).
     */
    public static function addWorkdays(Carbon $start, int $workdays): Carbon
    {
        $date = $start->copy();
        $added = 0;

        while ($added < $workdays) {
            $date->addDay();
            if (! $date->isWeekend()) {
                $added++;
            }
        }

        return $date;
    }
}
