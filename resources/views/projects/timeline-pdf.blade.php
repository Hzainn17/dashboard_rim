<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Timeline Pekerjaan — {{ $project->name }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 9mm 12mm 9mm 12mm;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: Helvetica, Arial, sans-serif;
            color: #1e293b;
            font-size: 8.2pt;
            line-height: 1.28;
            margin: 0;
            padding: 0;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8pt;
            border-bottom: 1.6pt solid #46797b;
        }
        .header-table td {
            vertical-align: top;
        }
        .brand-logo {
            height: 32pt;
            width: auto;
        }
        .brand-text {
            font-size: 19pt;
            font-weight: bold;
            color: #1e293b;
            line-height: 1;
        }
        .brand-sub {
            font-size: 7.5pt;
            letter-spacing: 2pt;
            color: #64748b;
            margin-top: 2pt;
        }
        .doc-title {
            font-size: 14pt;
            font-weight: bold;
            color: #46797b;
            margin: 0 0 2pt 0;
            letter-spacing: 0.4pt;
            text-align: right;
        }
        .doc-address-label {
            font-size: 6.8pt;
            font-weight: bold;
            color: #46797b;
            text-transform: uppercase;
            text-align: right;
            margin-bottom: 1pt;
        }
        .doc-address {
            font-size: 7.2pt;
            color: #475569;
            text-align: right;
            line-height: 1.25;
        }
        .meta-wrapper {
            width: 100%;
            border-collapse: collapse;
            background-color: #f1f5f9;
            border: 0.6pt solid #dbe3ec;
            border-left: 3pt solid #46797b;
            margin-bottom: 9pt;
        }
        .meta-wrapper > tbody > tr > td {
            padding: 6.5pt 10pt;
            vertical-align: top;
        }
        .meta-inner {
            border-collapse: collapse;
        }
        .meta-inner td {
            padding: 1pt 8pt 1pt 0;
            font-size: 8pt;
            color: #1e293b;
            vertical-align: top;
        }
        .meta-inner td.label {
            font-weight: bold;
            color: #475569;
            width: 84pt;
        }
        .doc-date {
            font-size: 7.5pt;
            color: #475569;
            font-style: italic;
            text-align: right;
            white-space: nowrap;
        }

        table.timeline-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 9pt;
        }
        table.timeline-table th {
            text-align: left;
            padding: 4.5pt 6pt;
            font-size: 7.5pt;
            font-weight: bold;
            color: #0f172a;
            background-color: #f8fafc;
            border-top: 1.2pt solid #334155;
            border-bottom: 1.4pt solid #334155;
            text-transform: uppercase;
        }
        table.timeline-table td {
            padding: 4pt 6pt;
            border-bottom: 0.5pt solid #cbd5e1;
            font-size: 8pt;
            vertical-align: middle;
        }
        .row-active { background-color: #f8d775; }
        .row-pending { background-color: #b4cbe0; }
        .row-completed { background-color: #cde5d9; }

        .section-heading {
            font-size: 7.6pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.4pt;
            color: #0f172a;
            border-bottom: 1.1pt solid #334155;
            padding-bottom: 2pt;
            margin: 6pt 0 4pt 0;
        }

        table.output-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 7pt;
        }
        table.output-table th {
            text-align: left;
            padding: 3.8pt 6pt;
            font-size: 7.5pt;
            font-weight: bold;
            color: #0f172a;
            border-bottom: 1.1pt solid #334155;
            text-transform: uppercase;
        }
        table.output-table td {
            padding: 3.2pt 6pt;
            vertical-align: top;
            font-size: 7.5pt;
            border-bottom: 0.5pt solid #e2e8f0;
            line-height: 1.25;
        }

        .notes-list {
            margin: 2pt 0 7pt 0;
            padding-left: 13pt;
            font-size: 7.5pt;
            color: #334155;
        }
        .notes-list li {
            margin-bottom: 1.5pt;
            line-height: 1.25;
        }

        table.legend-table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: avoid;
        }
        table.legend-table td {
            padding: 3pt 6pt;
            font-size: 7.5pt;
            border: 0.5pt solid #cbd5e1;
        }
        table.legend-table td.swatch {
            width: 26%;
        }

        .pdf-footer-note {
            margin-top: 7pt;
            padding-top: 3pt;
            border-top: 0.5pt solid #e2e8f0;
            font-size: 6.8pt;
            color: #64748b;
            text-align: right;
        }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td style="width: 44%; padding-bottom: 6pt;">
                @if(!empty($logoDataUri))
                    <img src="{{ $logoDataUri }}" alt="RIM Projects" class="brand-logo">
                @else
                    <div class="brand-text">RIM</div>
                    <div class="brand-sub">PROJECTS</div>
                @endif
            </td>
            <td style="width: 56%; padding-bottom: 6pt;">
                <div class="doc-title">TIMELINE PEKERJAAN</div>
                <div class="doc-address-label">ADDRESS</div>
                <div class="doc-address">
                    {{ $office->address ?? 'Jl. Edelweiss Blok D2, No. 4 Komplek Permata Biru, Cinunuk, Kec. Cileunyi, Kota Bandung, 40624' }}
                </div>
            </td>
        </tr>
    </table>

    <table class="meta-wrapper">
        <tr>
            <td style="width: 72%;">
                <table class="meta-inner">
                    <tr>
                        <td class="label">OWNER</td>
                        <td>: <strong>{{ strtoupper($project->client_name) }}</strong></td>
                    </tr>
                    <tr>
                        <td class="label">PROJECT NAME</td>
                        <td>: {{ $project->name }}</td>
                    </tr>
                    <tr>
                        <td class="label">PAKET LAYANAN</td>
                        <td>: {{ $project->package_name ?: ($project->category ?: 'Paket Perencanaan') }}@if($project->building_area) ({{ number_format((float) $project->building_area, 0) }} m&sup2;)@endif</td>
                    </tr>
                    <tr>
                        <td class="label">DATE START</td>
                        <td>: {{ $project->start_date ? $project->start_date->translatedFormat('d F Y') : '-' }}</td>
                    </tr>
                </table>
            </td>
            <td style="width: 28%;">
                <div class="doc-date">
                    Dokumen Pertanggal<br>{{ now()->translatedFormat('d F Y') }}
                </div>
            </td>
        </tr>
    </table>

    <table class="timeline-table">
        <thead>
            <tr>
                <th style="width: 38%;">TAHAP PEKERJAAN</th>
                <th style="width: 31%;">UPDATE DESAIN MAKSIMAL</th>
                <th style="width: 31%;">DISKUSI &amp; RESPON MAKSIMAL</th>
            </tr>
        </thead>
        <tbody>
            @forelse($stagesWithMeta as $item)
                @php
                    $stage = $item['stage'];
                    $rowClass = match($stage->status) {
                        'active' => 'row-active',
                        'completed' => 'row-completed',
                        default => 'row-pending',
                    };
                @endphp
                <tr class="{{ $rowClass }}">
                    <td style="font-weight: bold;">{{ $stage->name }}</td>
                    <td>{{ $stage->update_design_date ? $stage->update_design_date->translatedFormat('d F Y') : '-' }}</td>
                    <td>{{ $stage->client_response_date ? $stage->client_response_date->translatedFormat('d F Y') : '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="3" style="text-align: center; color: #64748b; padding: 10pt;">
                        Belum ada tahapan timeline yang diatur.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    @if(count($outputRows) > 0)
        <table class="output-table">
            <thead>
                <tr>
                    <th style="width: 28%;">PENJELASAN</th>
                    <th style="width: 72%;">OUTPUT DELIVERABLES</th>
                </tr>
            </thead>
            <tbody>
                @foreach($outputRows as $row)
                    <tr>
                        <td style="font-weight: bold;">{{ $row['name'] }}</td>
                        <td>{{ $row['output'] }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <div class="section-heading">KETERANGAN</div>
    <ol class="notes-list">
        @foreach($stagesWithMeta as $item)
            @if(!empty($item['workdays']))
                <li>{{ $item['stage']->name }}, membutuhkan waktu <strong>{{ $item['workdays'] }} hari kerja</strong> (Sabtu, Minggu, dan Hari Libur Nasional tidak dihitung).</li>
            @endif
        @endforeach
        <li>Batas respon maksimum bagi pemilik rumah untuk berdiskusi, mereview, dan memutuskan adalah <strong>3 hari kalender</strong>.</li>
        <li>Timeline desain ini merupakan estimasi dan dapat diperbarui di tiap versi apabila terdapat penyesuaian revisi maupun hari libur nasional.</li>
    </ol>

    <div class="section-heading">KETERANGAN WARNA STATUS</div>
    <table class="legend-table">
        <tr>
            <td class="swatch row-active">&nbsp;</td>
            <td>Dalam Proses Pengerjaan</td>
        </tr>
        <tr>
            <td class="swatch row-pending">&nbsp;</td>
            <td>Belum Dimulai</td>
        </tr>
        <tr>
            <td class="swatch row-completed">&nbsp;</td>
            <td>Sudah Selesai</td>
        </tr>
    </table>

    <div class="pdf-footer-note">
        {{ $office->office_name ?? 'RIM Studio Arsitektur' }} · Dicetak otomatis dari Sistem Manajemen Proyek RIM
    </div>
</body>
</html>
