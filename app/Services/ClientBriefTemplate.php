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
     * Official template labels for each building type.
     *
     * @return array<string, string>
     */
    public static function templateLabels(): array
    {
        return [
            'rumah_hunian' => 'Formulir Informasi Klien — Rumah Hunian',
            'komersial' => 'Formulir Informasi Klien — Komersial',
            'interior' => 'Formulir Informasi Klien — Interior',
        ];
    }

    /**
     * Return the official Client Brief fields matching the given building type.
     *
     * @return array<int, array{key: string, section: string, label: string, type: string, required: bool, options?: array<int, string>, help?: string}>
     */
    public static function forBuildingType(?string $buildingType): array
    {
        return match ($buildingType) {
            'komersial' => self::komersialFields(),
            'interior' => self::interiorFields(),
            default => self::rumahHunianFields(),
        };
    }

    /**
     * Default brief questions (Rumah Hunian).
     *
     * @return array<int, array{key: string, section: string, label: string, type: string, required: bool, options?: array<int, string>, help?: string}>
     */
    public static function defaultFields(): array
    {
        return self::rumahHunianFields();
    }

    /**
     * Official Template 1: FORMULIR INFORMASI KLIEN - RUMAH HUNIAN.
     *
     * @return array<int, array{key: string, section: string, label: string, type: string, required: bool, options?: array<int, string>, help?: string}>
     */
    public static function rumahHunianFields(): array
    {
        return [
            // Informasi Umum
            ['key' => 'nama_klien', 'section' => 'Informasi Umum', 'label' => 'Nama Lengkap', 'type' => 'text', 'required' => true],
            ['key' => 'alamat_klien', 'section' => 'Informasi Umum', 'label' => 'Alamat Saat Ini', 'type' => 'textarea', 'required' => false],
            ['key' => 'nomor_whatsapp', 'section' => 'Informasi Umum', 'label' => 'Nomor WhatsApp', 'type' => 'text', 'required' => true],
            ['key' => 'email', 'section' => 'Informasi Umum', 'label' => 'Email', 'type' => 'text', 'required' => false],

            // Informasi Proyek
            ['key' => 'lokasi_proyek', 'section' => 'Informasi Proyek', 'label' => 'Lokasi Proyek', 'type' => 'textarea', 'required' => true],
            ['key' => 'site_maps', 'section' => 'Informasi Proyek', 'label' => 'Titik Lokasi Proyek (Google Maps)', 'type' => 'maps', 'required' => false, 'help' => 'Tempel link Google Maps atau gunakan tombol lokasi saat berada di lahan.'],
            ['key' => 'status_lahan', 'section' => 'Informasi Proyek', 'label' => 'Status Lahan', 'type' => 'select', 'required' => true, 'options' => ['Lahan Kosong', 'Renovasi', 'Bangunan Lama (Bongkar Total)']],
            ['key' => 'luas_lahan', 'section' => 'Informasi Proyek', 'label' => 'Luas Lahan (m²)', 'type' => 'number', 'required' => false],
            ['key' => 'luas_bangunan', 'section' => 'Informasi Proyek', 'label' => 'Luas Bangunan (m²)', 'type' => 'number', 'required' => false],
            ['key' => 'anggaran', 'section' => 'Informasi Proyek', 'label' => 'Anggaran (Estimasi / Opsional)', 'type' => 'text', 'required' => false],
            ['key' => 'arah_rumah', 'section' => 'Informasi Proyek', 'label' => 'Arah Rumah (Arah Hadap Mata Angin)', 'type' => 'compass', 'required' => true],
            ['key' => 'target_mulai', 'section' => 'Informasi Proyek', 'label' => 'Target Mulai Pembangunan', 'type' => 'text', 'required' => false],
            ['key' => 'target_selesai', 'section' => 'Informasi Proyek', 'label' => 'Target Selesai', 'type' => 'text', 'required' => false],

            // Tujuan Proyek & Prioritas Utama
            ['key' => 'alasan_membangun', 'section' => 'Tujuan Proyek & Prioritas', 'label' => 'Mengapa ingin membangun / renovasi?', 'type' => 'textarea', 'required' => true],
            ['key' => 'harapan_terbesar', 'section' => 'Tujuan Proyek & Prioritas', 'label' => 'Apa harapan terbesar setelah project selesai?', 'type' => 'textarea', 'required' => false],
            ['key' => 'prioritas_utama', 'section' => 'Tujuan Proyek & Prioritas', 'label' => 'Prioritas Utama', 'type' => 'multiselect', 'required' => true, 'options' => ['Estetika', 'Fungsi', 'Budget', 'Waktu', 'Investasi', 'Kenyamanan']],

            // Data Penghuni
            ['key' => 'jumlah_penghuni', 'section' => 'Data Penghuni', 'label' => 'Jumlah penghuni (orang)', 'type' => 'number', 'required' => false],
            ['key' => 'daftar_penghuni', 'section' => 'Data Penghuni', 'label' => 'Daftar Penghuni (Nama / Hubungan, Umur, Aktivitas)', 'type' => 'textarea', 'required' => false, 'help' => 'Contoh: Ayah (40 th, WFH), Ibu (37 th, memasak), Anak 1 (10 th, sekolah).'],
            ['key' => 'penghuni_khusus', 'section' => 'Data Penghuni', 'label' => 'Apakah ada penghuni khusus?', 'type' => 'multiselect', 'required' => false, 'options' => ['Anak kecil', 'Lansia', 'Difabel', 'ART', 'Sopir', 'Hewan Peliharaan']],

            // Kebutuhan Ruang
            ['key' => 'ruang_lantai_1', 'section' => 'Kebutuhan Ruang', 'label' => 'Ruangan Lantai 1 yang Dibutuhkan', 'type' => 'multiselect', 'required' => false, 'options' => ['Carport', 'Garasi', 'Ruang Tamu', 'Living Room', 'Ruang Makan', 'Dapur Bersih', 'Dapur Kotor', 'Pantry', 'Mushola', 'Kamar Tidur', 'KM/WC', 'Laundry', 'Gudang', 'Taman']],
            ['key' => 'catatan_lantai_1', 'section' => 'Kebutuhan Ruang', 'label' => 'Jumlah & Catatan Ruang Lantai 1', 'type' => 'textarea', 'required' => false, 'help' => 'Tulis jumlah & catatan tiap ruang (misal: Carport 2 mobil, Kamar Tidur 1, KM/WC 2).'],
            ['key' => 'ruang_lantai_2', 'section' => 'Kebutuhan Ruang', 'label' => 'Ruangan Lantai 2 yang Dibutuhkan', 'type' => 'multiselect', 'required' => false, 'options' => ['Master Bedroom', 'Kamar Anak', 'Walk-in Closet', 'Family Area', 'Ruang Kerja', 'Balkon', 'Gym', 'Rooftop']],
            ['key' => 'catatan_lantai_2', 'section' => 'Kebutuhan Ruang', 'label' => 'Jumlah & Catatan Ruang Lantai 2', 'type' => 'textarea', 'required' => false, 'help' => 'Tulis jumlah & catatan ruang lantai 2 (misal: Kamar Anak 2, Balkon depan).'],

            // Aktivitas & Gaya Hidup
            ['key' => 'aktivitas_gaya_hidup', 'section' => 'Aktivitas & Gaya Hidup', 'label' => 'Checklist Aktivitas & Gaya Hidup', 'type' => 'multiselect', 'required' => false, 'options' => ['Work From Home', 'Sering Menerima Tamu', 'Suka Memasak', 'Koleksi Barang', 'Sering Acara Keluarga', 'Hobi Olahraga', 'Hobi Berkebun', 'Hobi Musik']],
            ['key' => 'aktivitas_lainnya', 'section' => 'Aktivitas & Gaya Hidup', 'label' => 'Aktivitas / Gaya Hidup Lainnya', 'type' => 'text', 'required' => false],

            // Referensi Desain
            ['key' => 'gaya_desain', 'section' => 'Referensi Desain', 'label' => 'Gaya Desain yang Disukai', 'type' => 'multiselect', 'required' => true, 'options' => ['Modern Minimalis', 'Tropis Modern', 'Japandi', 'Skandinavia', 'American Classic', 'Mediterania', 'Industrial', 'Kontemporer']],
            ['key' => 'gaya_desain_lainnya', 'section' => 'Referensi Desain', 'label' => 'Gaya Desain Lainnya', 'type' => 'text', 'required' => false],
            ['key' => 'warna_favorit', 'section' => 'Referensi Desain', 'label' => 'Warna Favorit', 'type' => 'text', 'required' => false],
            ['key' => 'material_favorit', 'section' => 'Referensi Desain', 'label' => 'Material Favorit', 'type' => 'textarea', 'required' => false],
            ['key' => 'material_dihindari', 'section' => 'Referensi Desain', 'label' => 'Material yang Tidak Disukai', 'type' => 'textarea', 'required' => false],
            ['key' => 'link_referensi', 'section' => 'Referensi Desain', 'label' => 'Link Referensi (Pinterest / Instagram)', 'type' => 'textarea', 'required' => false],
            ['key' => 'gambar_referensi', 'section' => 'Referensi Desain', 'label' => 'Upload Gambar Referensi Desain', 'type' => 'files', 'required' => false],

            // Data Teknis
            ['key' => 'sumber_air', 'section' => 'Data Teknis', 'label' => 'Sumur atau PDAM?', 'type' => 'select', 'required' => false, 'options' => ['Sumur', 'PDAM', 'Sumur & PDAM']],
            ['key' => 'posisi_septictank', 'section' => 'Data Teknis', 'label' => 'Septictank dimana?', 'type' => 'text', 'required' => false],
            ['key' => 'daya_listrik', 'section' => 'Data Teknis', 'label' => 'Listrik berapa watt?', 'type' => 'text', 'required' => false],
            ['key' => 'internet', 'section' => 'Data Teknis', 'label' => 'Internet?', 'type' => 'text', 'required' => false],
            ['key' => 'posisi_matahari', 'section' => 'Data Teknis', 'label' => 'Posisi matahari?', 'type' => 'text', 'required' => false],
            ['key' => 'angin_dominan', 'section' => 'Data Teknis', 'label' => 'Angin dominan?', 'type' => 'text', 'required' => false],
            ['key' => 'kontur_tanah', 'section' => 'Data Teknis', 'label' => 'Kontur tanah?', 'type' => 'text', 'required' => false],
            ['key' => 'riwayat_banjir', 'section' => 'Data Teknis', 'label' => 'Ada banjir?', 'type' => 'text', 'required' => false],
            ['key' => 'pohon_dipertahankan', 'section' => 'Data Teknis', 'label' => 'Ada pohon yang dipertahankan?', 'type' => 'text', 'required' => false],
            ['key' => 'kondisi_tanah', 'section' => 'Data Teknis', 'label' => 'Kondisi Tanah', 'type' => 'multiselect', 'required' => false, 'options' => ['Datar', 'Miring', 'Hook', 'Tengah']],
            ['key' => 'catatan_teknis', 'section' => 'Data Teknis', 'label' => 'Catatan Data Teknis', 'type' => 'textarea', 'required' => false],

            // Dokumentasi Survey & Catatan
            ['key' => 'checklist_survey', 'section' => 'Dokumentasi Survey & Catatan', 'label' => 'Checklist Dokumentasi Survey', 'type' => 'multiselect', 'required' => false, 'options' => ['Tampak Depan', 'Samping Kanan', 'Samping Kiri', 'Belakang', 'Jalan Depan', 'Lingkungan', 'Existing Interior', 'View Sekitar', 'Drone', 'Utilitas (listrik, air, drainase)']],
            ['key' => 'foto_survey', 'section' => 'Dokumentasi Survey & Catatan', 'label' => 'Upload Foto Dokumentasi Survey / Lahan Eksisting', 'type' => 'files', 'required' => false],
            ['key' => 'catatan_arsitek', 'section' => 'Dokumentasi Survey & Catatan', 'label' => 'Catatan Arsitek / Tambahan Klien', 'type' => 'textarea', 'required' => false],
        ];
    }

    /**
     * Official Template 2: FORMULIR INFORMASI KLIEN - KOMERSIL.
     *
     * @return array<int, array{key: string, section: string, label: string, type: string, required: bool, options?: array<int, string>, help?: string}>
     */
    public static function komersialFields(): array
    {
        return [
            // Informasi Umum
            ['key' => 'nama_usaha', 'section' => 'Informasi Umum', 'label' => 'Nama Usaha', 'type' => 'text', 'required' => true],
            ['key' => 'alamat_usaha', 'section' => 'Informasi Umum', 'label' => 'Alamat Usaha / Brand', 'type' => 'text', 'required' => false],
            ['key' => 'bidang_usaha', 'section' => 'Informasi Umum', 'label' => 'Bidang Usaha', 'type' => 'text', 'required' => true],
            ['key' => 'alamat_project', 'section' => 'Informasi Umum', 'label' => 'Alamat Project', 'type' => 'textarea', 'required' => true],
            ['key' => 'site_maps', 'section' => 'Informasi Umum', 'label' => 'Titik Lokasi Project (Google Maps)', 'type' => 'maps', 'required' => false, 'help' => 'Tempel link Google Maps atau gunakan tombol lokasi saat berada di lokasi.'],
            ['key' => 'nomor_hp', 'section' => 'Informasi Umum', 'label' => 'Nomor HP / WhatsApp', 'type' => 'text', 'required' => true],
            ['key' => 'email', 'section' => 'Informasi Umum', 'label' => 'Email', 'type' => 'text', 'required' => false],

            // Mengenal Bisnis Anda
            ['key' => 'cerita_bisnis', 'section' => 'Mengenal Bisnis Anda', 'label' => 'Ceritakan sedikit tentang bisnis Bapak/Ibu', 'type' => 'textarea', 'required' => true],
            ['key' => 'lama_bisnis', 'section' => 'Mengenal Bisnis Anda', 'label' => 'Sudah berapa lama bisnis ini berjalan?', 'type' => 'text', 'required' => false],
            ['key' => 'alasan_membangun', 'section' => 'Mengenal Bisnis Anda', 'label' => 'Mengapa ingin membangun atau merenovasi tempat usaha sekarang?', 'type' => 'textarea', 'required' => true],
            ['key' => 'tujuan_utama', 'section' => 'Mengenal Bisnis Anda', 'label' => 'Apa tujuan utama project ini?', 'type' => 'multiselect', 'required' => true, 'options' => ['Membuka usaha baru', 'Cabang baru', 'Rebranding', 'Menambah kapasitas', 'Meningkatkan omzet', 'Investasi', 'Lainnya']],

            // Mengenal Customer Bisnis
            ['key' => 'target_customer', 'section' => 'Mengenal Customer Bisnis', 'label' => 'Siapa target customer utama?', 'type' => 'multiselect', 'required' => true, 'options' => ['Anak-anak', 'Remaja', 'Mahasiswa', 'Profesional', 'Keluarga', 'Lansia', 'Wisatawan', 'Lainnya']],
            ['key' => 'usia_customer', 'section' => 'Mengenal Customer Bisnis', 'label' => 'Rata-rata usia customer', 'type' => 'text', 'required' => false],
            ['key' => 'perkiraan_customer', 'section' => 'Mengenal Customer Bisnis', 'label' => 'Berapa perkiraan customer setiap hari?', 'type' => 'text', 'required' => false],
            ['key' => 'jam_operasional', 'section' => 'Mengenal Customer Bisnis', 'label' => 'Jam operasional', 'type' => 'text', 'required' => false],
            ['key' => 'jam_tersibuk', 'section' => 'Mengenal Customer Bisnis', 'label' => 'Jam tersibuk', 'type' => 'text', 'required' => false],

            // Aktivitas Operasional
            ['key' => 'aktivitas_buka_tutup', 'section' => 'Aktivitas Operasional', 'label' => 'Ceritakan bagaimana aktivitas bisnis dari buka hingga tutup', 'type' => 'textarea', 'required' => false],
            ['key' => 'alur_customer', 'section' => 'Aktivitas Operasional', 'label' => 'Bagaimana alur customer masuk sampai keluar?', 'type' => 'textarea', 'required' => false],
            ['key' => 'alur_karyawan', 'section' => 'Aktivitas Operasional', 'label' => 'Bagaimana alur karyawan bekerja?', 'type' => 'textarea', 'required' => false],
            ['key' => 'kendala_operasional', 'section' => 'Aktivitas Operasional', 'label' => 'Apakah ada kendala pada operasional saat ini?', 'type' => 'textarea', 'required' => false],

            // Kebutuhan Ruang
            ['key' => 'area_customer', 'section' => 'Kebutuhan Ruang', 'label' => 'Area Customer', 'type' => 'multiselect', 'required' => false, 'options' => ['Area Parkir', 'Lobby', 'Waiting Area', 'Reception', 'Area Indoor', 'Area Outdoor', 'VIP Room', 'Private Room', 'Mushola', 'Toilet', 'Area Foto', 'Area Event', 'Kids Area']],
            ['key' => 'catatan_area_customer', 'section' => 'Kebutuhan Ruang', 'label' => 'Catatan Area Customer', 'type' => 'textarea', 'required' => false],
            ['key' => 'area_operasional', 'section' => 'Kebutuhan Ruang', 'label' => 'Area Operasional', 'type' => 'multiselect', 'required' => false, 'options' => ['Kitchen', 'Pantry', 'Bar', 'Gudang', 'Office', 'Ruang Staff', 'Locker', 'Laundry', 'Loading Area', 'Area Sampah']],
            ['key' => 'catatan_area_operasional', 'section' => 'Kebutuhan Ruang', 'label' => 'Catatan Area Operasional', 'type' => 'textarea', 'required' => false],

            // Identitas Brand & Referensi Desain
            ['key' => 'karakter_brand', 'section' => 'Identitas Brand & Referensi Desain', 'label' => 'Kalau brand ini diibaratkan seseorang, seperti apa karakternya?', 'type' => 'multiselect', 'required' => false, 'options' => ['Elegan', 'Premium', 'Friendly', 'Santai', 'Mewah', 'Modern', 'Industrial', 'Natural', 'Minimalis', 'Fun', 'Profesional', 'Lainnya']],
            ['key' => 'kesan_pertama', 'section' => 'Identitas Brand & Referensi Desain', 'label' => 'Apa kesan pertama yang ingin dirasakan customer saat datang?', 'type' => 'textarea', 'required' => false],
            ['key' => 'gaya_desain', 'section' => 'Identitas Brand & Referensi Desain', 'label' => 'Referensi Gaya Desain Komersial', 'type' => 'multiselect', 'required' => true, 'options' => ['Modern Minimalis', 'Industrial', 'Tropis Modern', 'Japandi', 'Skandinavia', 'Mediterania', 'Kontemporer', 'American Classic']],
            ['key' => 'gaya_desain_lainnya', 'section' => 'Identitas Brand & Referensi Desain', 'label' => 'Gaya Desain Lainnya', 'type' => 'text', 'required' => false],
            ['key' => 'warna_favorit', 'section' => 'Identitas Brand & Referensi Desain', 'label' => 'Warna Favorit', 'type' => 'text', 'required' => false],
            ['key' => 'material_dihindari', 'section' => 'Identitas Brand & Referensi Desain', 'label' => 'Material yang Tidak Disukai', 'type' => 'textarea', 'required' => false],
            ['key' => 'link_referensi', 'section' => 'Identitas Brand & Referensi Desain', 'label' => 'Link Referensi', 'type' => 'textarea', 'required' => false],
            ['key' => 'gambar_referensi', 'section' => 'Identitas Brand & Referensi Desain', 'label' => 'Upload Gambar Referensi Desain', 'type' => 'files', 'required' => false],

            // Budget & Timeline
            ['key' => 'estimasi_budget', 'section' => 'Budget & Timeline', 'label' => 'Estimasi Budget', 'type' => 'select', 'required' => false, 'options' => ['Belum ada', '< 500 juta', '500 juta - 1 Miliar', '1 - 2 Miliar', '> 2 Miliar', 'Lainnya']],
            ['key' => 'target_mulai', 'section' => 'Budget & Timeline', 'label' => 'Target Mulai', 'type' => 'text', 'required' => false],
            ['key' => 'target_opening', 'section' => 'Budget & Timeline', 'label' => 'Target Opening', 'type' => 'text', 'required' => false],

            // Data Teknis
            ['key' => 'sumber_air', 'section' => 'Data Teknis', 'label' => 'Sumur atau PDAM?', 'type' => 'select', 'required' => false, 'options' => ['Sumur', 'PDAM', 'Sumur & PDAM']],
            ['key' => 'posisi_septictank', 'section' => 'Data Teknis', 'label' => 'Septictank dimana?', 'type' => 'text', 'required' => false],
            ['key' => 'daya_listrik', 'section' => 'Data Teknis', 'label' => 'Listrik berapa watt?', 'type' => 'text', 'required' => false],
            ['key' => 'internet', 'section' => 'Data Teknis', 'label' => 'Internet?', 'type' => 'text', 'required' => false],
            ['key' => 'posisi_matahari', 'section' => 'Data Teknis', 'label' => 'Posisi matahari?', 'type' => 'text', 'required' => false],
            ['key' => 'angin_dominan', 'section' => 'Data Teknis', 'label' => 'Angin dominan?', 'type' => 'text', 'required' => false],
            ['key' => 'kontur_tanah', 'section' => 'Data Teknis', 'label' => 'Kontur tanah?', 'type' => 'text', 'required' => false],
            ['key' => 'riwayat_banjir', 'section' => 'Data Teknis', 'label' => 'Ada banjir?', 'type' => 'text', 'required' => false],
            ['key' => 'pohon_dipertahankan', 'section' => 'Data Teknis', 'label' => 'Ada pohon yang dipertahankan?', 'type' => 'text', 'required' => false],
            ['key' => 'kondisi_tanah', 'section' => 'Data Teknis', 'label' => 'Kondisi Tanah', 'type' => 'multiselect', 'required' => false, 'options' => ['Datar', 'Miring', 'Hook', 'Tengah']],
            ['key' => 'catatan_teknis', 'section' => 'Data Teknis', 'label' => 'Catatan Data Teknis', 'type' => 'textarea', 'required' => false],

            // Dokumentasi Survey & Harapan
            ['key' => 'checklist_survey', 'section' => 'Dokumentasi Survey & Harapan', 'label' => 'Checklist Dokumentasi Survey', 'type' => 'multiselect', 'required' => false, 'options' => ['Tampak Depan', 'Samping Kanan', 'Samping Kiri', 'Belakang', 'Jalan Depan', 'Lingkungan', 'Existing Interior', 'View Sekitar', 'Drone', 'Utilitas (listrik, air, drainase)']],
            ['key' => 'foto_survey', 'section' => 'Dokumentasi Survey & Harapan', 'label' => 'Upload Foto Dokumentasi Survey / Lokasi Eksisting', 'type' => 'files', 'required' => false],
            ['key' => 'harapan_klien', 'section' => 'Dokumentasi Survey & Harapan', 'label' => 'Setelah project ini selesai, apa yang paling ingin Bapak/Ibu rasakan?', 'type' => 'textarea', 'required' => false],
            ['key' => 'catatan_arsitek', 'section' => 'Dokumentasi Survey & Harapan', 'label' => 'Catatan Arsitek', 'type' => 'textarea', 'required' => false],
        ];
    }

    /**
     * Official Template 3: FORMULIR INFORMASI KLIEN - INTERIOR.
     *
     * @return array<int, array{key: string, section: string, label: string, type: string, required: bool, options?: array<int, string>, help?: string}>
     */
    public static function interiorFields(): array
    {
        return [
            // Informasi Umum
            ['key' => 'nama_klien', 'section' => 'Informasi Umum', 'label' => 'Nama Lengkap', 'type' => 'text', 'required' => true],
            ['key' => 'alamat_klien', 'section' => 'Informasi Umum', 'label' => 'Alamat', 'type' => 'textarea', 'required' => false],
            ['key' => 'nomor_whatsapp', 'section' => 'Informasi Umum', 'label' => 'Nomor WhatsApp', 'type' => 'text', 'required' => true],
            ['key' => 'email', 'section' => 'Informasi Umum', 'label' => 'Email', 'type' => 'text', 'required' => false],

            // Informasi Proyek
            ['key' => 'lokasi_proyek', 'section' => 'Informasi Proyek', 'label' => 'Lokasi Proyek', 'type' => 'textarea', 'required' => true],
            ['key' => 'jenis_ruangan', 'section' => 'Informasi Proyek', 'label' => 'Jenis Ruangan', 'type' => 'text', 'required' => true, 'help' => 'Contoh: Living Room, Kamar Tidur Utama, Kitchen Set, Ruang Kerja, dll.'],
            ['key' => 'luas_area', 'section' => 'Informasi Proyek', 'label' => 'Luas Area (m²)', 'type' => 'number', 'required' => false],
            ['key' => 'status_bangunan', 'section' => 'Informasi Proyek', 'label' => 'Status Bangunan', 'type' => 'select', 'required' => true, 'options' => ['Baru', 'Renovasi', 'Eksisting']],
            ['key' => 'foto_ruangan_eksisting', 'section' => 'Informasi Proyek', 'label' => 'Upload Foto Kondisi Ruangan Eksisting', 'type' => 'files', 'required' => false],

            // Aktivitas Pengguna
            ['key' => 'pengguna_ruangan', 'section' => 'Aktivitas Pengguna', 'label' => 'Siapa saja yang akan menggunakan ruangan ini?', 'type' => 'textarea', 'required' => true],
            ['key' => 'aktivitas_utama', 'section' => 'Aktivitas Pengguna', 'label' => 'Aktivitas utama yang dilakukan di ruangan ini?', 'type' => 'textarea', 'required' => true],
            ['key' => 'aktivitas_sering', 'section' => 'Aktivitas Pengguna', 'label' => 'Aktivitas apa yang paling sering dilakukan?', 'type' => 'textarea', 'required' => false],

            // Permasalahan Saat Ini
            ['key' => 'permasalahan_eksisting', 'section' => 'Permasalahan Saat Ini', 'label' => 'Apa yang paling mengganggu dari kondisi sekarang?', 'type' => 'multiselect', 'required' => false, 'options' => ['Terlalu sempit', 'Kurang pencahayaan', 'Kurang storage', 'Terlalu panas', 'Sirkulasi buruk', 'Layout tidak nyaman', 'Kurang estetik', 'Sulit dibersihkan', 'Furniture sudah rusak', 'Lainnya']],

            // Kebutuhan Ruangan & Storage
            ['key' => 'aktivitas_terakomodasi', 'section' => 'Kebutuhan Ruangan & Storage', 'label' => 'Aktivitas apa saja yang harus terakomodasi?', 'type' => 'textarea', 'required' => false],
            ['key' => 'furniture_dipertahankan', 'section' => 'Kebutuhan Ruangan & Storage', 'label' => 'Furniture apa yang ingin dipertahankan?', 'type' => 'textarea', 'required' => false],
            ['key' => 'furniture_diganti', 'section' => 'Kebutuhan Ruangan & Storage', 'label' => 'Furniture apa yang ingin diganti?', 'type' => 'textarea', 'required' => false],
            ['key' => 'barang_disimpan', 'section' => 'Kebutuhan Ruangan & Storage', 'label' => 'Barang apa saja yang perlu disimpan (Storage)?', 'type' => 'textarea', 'required' => false],
            ['key' => 'preferensi_storage', 'section' => 'Kebutuhan Ruangan & Storage', 'label' => 'Apakah lebih suka jenis storage berikut?', 'type' => 'multiselect', 'required' => false, 'options' => ['Hidden Storage', 'Open Shelf', 'Display', 'Kombinasi']],

            // Referensi Desain
            ['key' => 'gaya_konsep', 'section' => 'Referensi Desain', 'label' => 'Gaya Konsep Interior yang Disukai', 'type' => 'multiselect', 'required' => true, 'options' => ['Japandi', 'Modern Minimalis', 'Skandinavia', 'Industrial', 'Tropis Modern', 'American Classic', 'Mediterania', 'Kontemporer']],
            ['key' => 'gaya_konsep_lainnya', 'section' => 'Referensi Desain', 'label' => 'Gaya Konsep Lainnya (Opsional)', 'type' => 'text', 'required' => false],
            ['key' => 'warna_favorit', 'section' => 'Referensi Desain', 'label' => 'Warna Favorit', 'type' => 'text', 'required' => false],
            ['key' => 'material_favorit', 'section' => 'Referensi Desain', 'label' => 'Material Favorit', 'type' => 'textarea', 'required' => false],
            ['key' => 'material_dihindari', 'section' => 'Referensi Desain', 'label' => 'Material yang Dihindari', 'type' => 'textarea', 'required' => false],
            ['key' => 'gambar_referensi', 'section' => 'Referensi Desain', 'label' => 'Upload Gambar Referensi Desain Interior', 'type' => 'files', 'required' => false],

            // Budget, Timeline & Harapan
            ['key' => 'budget', 'section' => 'Budget, Timeline & Harapan', 'label' => 'Budget', 'type' => 'text', 'required' => false],
            ['key' => 'target_selesai', 'section' => 'Budget, Timeline & Harapan', 'label' => 'Target Selesai', 'type' => 'text', 'required' => false],
            ['key' => 'harapan_klien', 'section' => 'Budget, Timeline & Harapan', 'label' => 'Setelah project ini selesai, apa yang paling ingin Bapak/Ibu rasakan?', 'type' => 'textarea', 'required' => false],
            ['key' => 'catatan_designer', 'section' => 'Budget, Timeline & Harapan', 'label' => 'Catatan Interior Designer', 'type' => 'textarea', 'required' => false],
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
