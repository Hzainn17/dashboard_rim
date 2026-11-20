<?php

namespace App\Services;

class ClientBriefTemplate
{
    /**
     * Supported field input types for the client brief form.
     *
     * @return array<int, string>
     */
    public static function fieldTypes(): array
    {
        return ['text', 'textarea', 'number', 'select', 'multiselect', 'url', 'maps', 'compass', 'files'];
    }

    /**
     * Default brief questions an architect needs before brainstorming.
     *
     * @return array<int, array{key: string, section: string, label: string, type: string, required: bool, options?: array<int, string>, help?: string}>
     */
    public static function defaultFields(): array
    {
        return [
            // Data Lokasi & Lahan
            ['key' => 'site_address', 'section' => 'Data Lokasi & Lahan', 'label' => 'Alamat lengkap lokasi rumah / lahan', 'type' => 'textarea', 'required' => true],
            ['key' => 'site_maps', 'section' => 'Data Lokasi & Lahan', 'label' => 'Titik lokasi di peta (Google Maps)', 'type' => 'maps', 'required' => true, 'help' => 'Tempel link Google Maps atau tekan "Gunakan Lokasi Saya" saat berada di lokasi.'],
            ['key' => 'site_orientation', 'section' => 'Data Lokasi & Lahan', 'label' => 'Arah hadap muka lahan / bangunan (arah mata angin)', 'type' => 'compass', 'required' => true],
            ['key' => 'land_size', 'section' => 'Data Lokasi & Lahan', 'label' => 'Ukuran lahan (panjang × lebar, m)', 'type' => 'text', 'required' => true, 'help' => 'Contoh: 10 × 20 m'],
            ['key' => 'land_area', 'section' => 'Data Lokasi & Lahan', 'label' => 'Luas lahan (m²)', 'type' => 'number', 'required' => false],
            ['key' => 'land_condition', 'section' => 'Data Lokasi & Lahan', 'label' => 'Kondisi lahan saat ini', 'type' => 'select', 'required' => false, 'options' => ['Lahan kosong', 'Ada bangunan lama (renovasi)', 'Ada bangunan lama (dibongkar total)', 'Lahan berkontur / miring']],
            ['key' => 'site_surroundings', 'section' => 'Data Lokasi & Lahan', 'label' => 'Kondisi sekitar (lebar jalan depan, tetangga, view, sungai, dll.)', 'type' => 'textarea', 'required' => false],
            ['key' => 'site_photos', 'section' => 'Data Lokasi & Lahan', 'label' => 'Foto kondisi lahan / bangunan eksisting', 'type' => 'files', 'required' => false],
            ['key' => 'land_documents', 'section' => 'Data Lokasi & Lahan', 'label' => 'Dokumen pendukung (sertifikat / gambar ukur / denah lama)', 'type' => 'files', 'required' => false],

            // Kebutuhan Ruang
            ['key' => 'building_area_plan', 'section' => 'Kebutuhan Ruang', 'label' => 'Rencana luas bangunan (m²)', 'type' => 'number', 'required' => false],
            ['key' => 'floors', 'section' => 'Kebutuhan Ruang', 'label' => 'Jumlah lantai yang direncanakan', 'type' => 'select', 'required' => true, 'options' => ['1 Lantai', '2 Lantai', '3 Lantai', 'Lebih dari 3 Lantai']],
            ['key' => 'bedrooms', 'section' => 'Kebutuhan Ruang', 'label' => 'Jumlah kamar tidur', 'type' => 'number', 'required' => true],
            ['key' => 'bathrooms', 'section' => 'Kebutuhan Ruang', 'label' => 'Jumlah kamar mandi', 'type' => 'number', 'required' => true],
            ['key' => 'rooms_needed', 'section' => 'Kebutuhan Ruang', 'label' => 'Ruangan lain yang dibutuhkan', 'type' => 'multiselect', 'required' => false, 'options' => ['Ruang Tamu', 'Ruang Keluarga', 'Dapur Bersih', 'Dapur Kotor', 'Ruang Makan', 'Mushola', 'Ruang Kerja', 'Carport / Garasi', 'Taman', 'Kolam Renang', 'Gudang', 'Kamar ART', 'Laundry / Jemur', 'Rooftop']],
            ['key' => 'occupants', 'section' => 'Kebutuhan Ruang', 'label' => 'Penghuni rumah (jumlah & usia, kebutuhan khusus lansia/anak)', 'type' => 'textarea', 'required' => false],
            ['key' => 'vehicles', 'section' => 'Kebutuhan Ruang', 'label' => 'Jumlah kendaraan (mobil / motor)', 'type' => 'text', 'required' => false],

            // Rencana Desain
            ['key' => 'design_style', 'section' => 'Rencana & Referensi Desain', 'label' => 'Gaya desain yang diinginkan', 'type' => 'multiselect', 'required' => true, 'options' => ['Modern Minimalis', 'Tropis Modern', 'Industrial', 'Skandinavia', 'Klasik / Kolonial', 'Japandi', 'Mediterania', 'Kontemporer']],
            ['key' => 'design_vision', 'section' => 'Rencana & Referensi Desain', 'label' => 'Ceritakan rumah impian Anda (suasana, aktivitas, prioritas)', 'type' => 'textarea', 'required' => true],
            ['key' => 'color_material', 'section' => 'Rencana & Referensi Desain', 'label' => 'Preferensi warna & material', 'type' => 'textarea', 'required' => false],
            ['key' => 'reference_links', 'section' => 'Rencana & Referensi Desain', 'label' => 'Link referensi desain (Pinterest / Instagram)', 'type' => 'textarea', 'required' => false],
            ['key' => 'reference_images', 'section' => 'Rencana & Referensi Desain', 'label' => 'Upload gambar referensi desain', 'type' => 'files', 'required' => false],

            // Anggaran & Waktu
            ['key' => 'construction_budget', 'section' => 'Anggaran & Target Waktu', 'label' => 'Estimasi anggaran pembangunan', 'type' => 'select', 'required' => false, 'options' => ['< Rp 500 juta', 'Rp 500 juta – 1 M', 'Rp 1 – 2 M', 'Rp 2 – 5 M', '> Rp 5 M']],
            ['key' => 'build_target', 'section' => 'Anggaran & Target Waktu', 'label' => 'Target mulai pembangunan', 'type' => 'text', 'required' => false],
            ['key' => 'additional_notes', 'section' => 'Anggaran & Target Waktu', 'label' => 'Catatan tambahan untuk arsitek', 'type' => 'textarea', 'required' => false],
        ];
    }

    /**
     * Compass direction options for orientation fields.
     *
     * @return array<int, string>
     */
    public static function compassOptions(): array
    {
        return ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
    }
}
