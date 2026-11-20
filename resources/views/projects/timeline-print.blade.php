<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Timeline Pekerjaan — {{ $project->name }} — RIM Project</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #f1f5f9;
            color: #1e293b;
            margin: 0;
            padding: 24px 16px;
            line-height: 1.45;
            font-size: 12px;
        }
        .toolbar {
            max-width: 820px;
            margin: 0 auto 16px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #ffffff;
            padding: 12px 20px;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            color: #1e293b;
        }
        .btn-primary {
            background: #46797b;
            border-color: #46797b;
            color: #ffffff;
        }
        .sheet {
            max-width: 820px;
            margin: 0 auto;
            background: #ffffff;
            padding: 36px 40px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
        }
        .brand-logo {
            max-height: 52px;
            width: auto;
            object-fit: contain;
        }
        .brand-text {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.04em;
            color: #1e293b;
            line-height: 1;
        }
        .brand-sub {
            font-size: 11px;
            letter-spacing: 0.25em;
            color: #64748b;
            margin-top: 2px;
        }
        .doc-title-wrap {
            text-align: right;
        }
        .doc-title {
            font-size: 20px;
            font-weight: 800;
            color: #46797b;
            margin: 0 0 4px 0;
            letter-spacing: 0.02em;
        }
        .doc-address-label {
            font-size: 10px;
            font-weight: 700;
            color: #46797b;
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        .doc-address {
            font-size: 10.5px;
            color: #475569;
            max-width: 260px;
            margin-left: auto;
        }
        .meta-box {
            background: #f1f5f9;
            padding: 14px 18px;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
        }
        .meta-table td {
            padding: 2px 12px 2px 0;
            font-size: 11.5px;
            color: #334155;
        }
        .meta-table td.label {
            font-weight: 600;
            color: #475569;
            width: 115px;
        }
        .doc-date {
            font-size: 11px;
            color: #475569;
            font-style: italic;
        }
        table.timeline-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }
        table.timeline-table th {
            text-align: left;
            padding: 8px 10px;
            font-size: 11px;
            font-weight: 700;
            color: #0f172a;
            border-bottom: 2px solid #334155;
            text-transform: uppercase;
        }
        table.timeline-table td {
            padding: 7px 10px;
            border-bottom: 1px solid #cbd5e1;
            font-size: 11.5px;
        }
        .row-active { background-color: #f8d775; }
        .row-pending { background-color: #b4cbe0; }
        .row-completed { background-color: #cde5d9; }

        .section-heading {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #0f172a;
            border-bottom: 1.5px solid #334155;
            padding-bottom: 4px;
            margin: 20px 0 10px 0;
        }
        table.output-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
        }
        table.output-table th, table.output-table td {
            padding: 6px 8px;
            vertical-align: top;
            font-size: 11px;
            border-bottom: 1px solid #e2e8f0;
        }
        table.output-table th {
            text-align: left;
            font-weight: 700;
            border-bottom: 1.5px solid #334155;
        }
        .notes-list {
            margin: 6px 0 18px 0;
            padding-left: 18px;
            font-size: 11px;
            color: #334155;
        }
        .notes-list li {
            margin-bottom: 3px;
        }
        table.legend-table {
            width: 100%;
            border-collapse: collapse;
        }
        table.legend-table td {
            padding: 5px 10px;
            font-size: 11px;
            border-bottom: 1px solid #e2e8f0;
        }
        table.legend-table td.swatch {
            width: 36%;
        }

        @media print {
            body { background: #ffffff; padding: 0; }
            .toolbar { display: none; }
            .sheet { box-shadow: none; padding: 12px 16px; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <a href="{{ route('projects.show', $project->id) }}" class="btn">← Kembali ke Proyek</a>
        <button onclick="window.print()" class="btn btn-primary">🖨️ Cetak / Simpan PDF</button>
    </div>

    <div class="sheet">
        <div class="header">
            <div>
                @if(!empty($office->company_logo_url))
                    <img src="{{ $office->company_logo_url }}" alt="RIM Projects" class="brand-logo">
                @else
                    <div class="brand-text">RIM</div>
                    <div class="brand-sub">PROJECTS</div>
                @endif
            </div>
            <div class="doc-title-wrap">
                <h1 class="doc-title">TIMELINE PEKERJAAN</h1>
                <div class="doc-address-label">ADDRESS</div>
                <div class="doc-address">
                    {{ $office->address ?? 'Jl. Edelweiss Blok D2, No. 4 Komplek Permata Biru, Cinunuk, Kec. Cileunyi, Kota Bandung, 40624' }}
                </div>
            </div>
        </div>

        <div class="meta-box">
            <table class="meta-table">
                <tr>
                    <td class="label">OWNER</td>
                    <td>: {{ strtoupper($project->client_name) }}</td>
                </tr>
                <tr>
                    <td class="label">PROJECT NAME</td>
                    <td>: {{ $project->name }}</td>
                </tr>
                <tr>
                    <td class="label">PAKET LAYANAN</td>
                    <td>: {{ $project->package_name ?: ($project->category ?: 'Paket 1') }}@if($project->building_area) ({{ number_format($project->building_area, 0) }} m²)@endif</td>
                </tr>
                <tr>
                    <td class="label">DATE START</td>
                    <td>: {{ $project->start_date ? $project->start_date->translatedFormat('d-F-Y') : '-' }}</td>
                </tr>
            </table>
            <div class="doc-date">
                Dokumen Pertanggal {{ now()->translatedFormat('d F Y') }}
            </div>
        </div>

        <table class="timeline-table">
            <thead>
                <tr>
                    <th>TAHAP PEKERJAAN</th>
                    <th>UPDATE DESAIN MAKSIMAL</th>
                    <th>DISKUSI &amp; RESPON MAKSIMAL</th>
                </tr>
            </thead>
            <tbody>
                @forelse($project->stages as $stage)
                    @php
                        $rowClass = match($stage->status) {
                            'active' => 'row-active',
                            'completed' => 'row-completed',
                            default => 'row-pending',
                        };
                    @endphp
                    <tr class="{{ $rowClass }}">
                        <td style="font-weight: 600;">{{ $stage->name }}</td>
                        <td>{{ $stage->update_design_date ? $stage->update_design_date->translatedFormat('d-F-Y') : '-' }}</td>
                        <td>{{ $stage->client_response_date ? $stage->client_response_date->translatedFormat('d-F-Y') : '-' }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="3" style="text-align:center; color:#64748b;">Belum ada tahapan timeline yang diatur.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <table class="output-table">
            <thead>
                <tr>
                    <th style="width: 28%;">PENJELASAN</th>
                    <th>OUTPUT</th>
                </tr>
            </thead>
            <tbody>
                @foreach($project->stages as $stage)
                    @if(!empty($stage->output_notes))
                        <tr>
                            <td style="font-weight: 600;">{{ $stage->name }}</td>
                            <td>{{ $stage->output_notes }}</td>
                        </tr>
                    @endif
                @endforeach
            </tbody>
        </table>

        <div class="section-heading">KETERANGAN</div>
        <ol class="notes-list">
            @foreach($project->stages as $stage)
                @if($stage->duration_workdays)
                    <li>{{ $stage->name }}, membutuhkan waktu <strong>{{ $stage->duration_workdays }} hari kerja</strong> (Sabtu, Minggu, dan Hari Libur tidak dihitung).</li>
                @endif
            @endforeach
            <li>Batas respon maksimum bagi pemilik rumah untuk berdiskusi, mereview, dan memutuskan adalah <strong>3 hari kalender</strong>.</li>
            <li>Timeline desain ini merupakan estimasi dan dapat diubah/diupdate di tiap versi, memungkinkan juga ada perubahan jika terdapat libur nasional.</li>
        </ol>

        <div class="section-heading">KETERANGAN WARNA</div>
        <table class="legend-table">
            <tr>
                <td class="swatch row-active"></td>
                <td>Dalam Proses Pengerjaan</td>
            </tr>
            <tr>
                <td class="swatch row-pending"></td>
                <td>Belum Dimulai</td>
            </tr>
            <tr>
                <td class="swatch row-completed"></td>
                <td>Sudah Selesai</td>
            </tr>
        </table>
    </div>
</body>
</html>
