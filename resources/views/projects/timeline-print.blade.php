<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Timeline Pekerjaan — {{ $project->name }} — RIM Projects</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 11mm 13mm 12mm 13mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #e2e8f0;
            color: #1e293b;
            margin: 0;
            padding: 20px 12px 36px;
            line-height: 1.38;
            font-size: 11.5px;
        }
        .toolbar {
            width: 210mm;
            max-width: 100%;
            margin: 0 auto 14px auto;
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            background: #ffffff;
            padding: 11px 18px;
            border-radius: 10px;
            border: 1px solid #cbd5e1;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
        }
        .toolbar-actions {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 14px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            color: #1e293b;
            transition: background 0.15s;
        }
        .btn:hover {
            background: #f8fafc;
        }
        .btn-primary {
            background: #46797b;
            border-color: #46797b;
            color: #ffffff;
        }
        .btn-primary:hover {
            background: #3a6668;
        }
        .btn-dark {
            background: #1e293b;
            border-color: #1e293b;
            color: #ffffff;
        }
        .btn-dark:hover {
            background: #0f172a;
        }
        /* Exact A4 Portrait Sheet (210mm width) */
        .sheet {
            width: 210mm;
            min-height: 297mm;
            max-width: 100%;
            margin: 0 auto;
            background: #ffffff;
            padding: 13mm 14mm;
            border-radius: 6px;
            box-shadow: 0 8px 28px rgba(15, 23, 42, 0.1);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            padding-bottom: 12px;
            margin-bottom: 16px;
            border-bottom: 2px solid #46797b;
        }
        .brand-logo {
            max-height: 48px;
            width: auto;
            object-fit: contain;
        }
        .brand-text {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.04em;
            color: #1e293b;
            line-height: 1;
        }
        .brand-sub {
            font-size: 10px;
            letter-spacing: 0.25em;
            color: #64748b;
            margin-top: 2px;
        }
        .doc-title-wrap {
            text-align: right;
        }
        .doc-title {
            font-size: 19px;
            font-weight: 800;
            color: #46797b;
            margin: 0 0 3px 0;
            letter-spacing: 0.02em;
        }
        .doc-address-label {
            font-size: 9.5px;
            font-weight: 700;
            color: #46797b;
            text-transform: uppercase;
            margin-bottom: 1px;
        }
        .doc-address {
            font-size: 10px;
            color: #475569;
            max-width: 270px;
            margin-left: auto;
            line-height: 1.35;
        }
        .meta-box {
            background: #f1f5f9;
            border: 1px solid #dbe3ec;
            border-left: 4px solid #46797b;
            padding: 11px 15px;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 16px;
        }
        .meta-table {
            border-collapse: collapse;
        }
        .meta-table td {
            padding: 1.5px 10px 1.5px 0;
            font-size: 11px;
            color: #1e293b;
        }
        .meta-table td.label {
            font-weight: 700;
            color: #475569;
            width: 115px;
        }
        .doc-date {
            font-size: 10.5px;
            color: #475569;
            font-style: italic;
            text-align: right;
            white-space: nowrap;
        }
        table.timeline-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        table.timeline-table th {
            text-align: left;
            padding: 7px 9px;
            font-size: 10.5px;
            font-weight: 700;
            color: #0f172a;
            background: #f8fafc;
            border-top: 1.5px solid #334155;
            border-bottom: 2px solid #334155;
            text-transform: uppercase;
        }
        table.timeline-table td {
            padding: 6.5px 9px;
            border-bottom: 1px solid #cbd5e1;
            font-size: 11px;
        }
        .row-active { background-color: #f8d775 !important; }
        .row-pending { background-color: #b4cbe0 !important; }
        .row-completed { background-color: #cde5d9 !important; }

        .section-heading {
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: #0f172a;
            border-bottom: 1.5px solid #334155;
            padding-bottom: 3px;
            margin: 14px 0 8px 0;
        }
        table.output-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        table.output-table th, table.output-table td {
            padding: 5.5px 8px;
            vertical-align: top;
            font-size: 10.5px;
            border-bottom: 1px solid #e2e8f0;
        }
        table.output-table th {
            text-align: left;
            font-weight: 700;
            border-bottom: 1.5px solid #334155;
            text-transform: uppercase;
        }
        .notes-list {
            margin: 4px 0 14px 0;
            padding-left: 18px;
            font-size: 10.5px;
            color: #334155;
        }
        .notes-list li {
            margin-bottom: 2.5px;
        }
        table.legend-table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: avoid;
        }
        table.legend-table td {
            padding: 5px 10px;
            font-size: 10.5px;
            border: 1px solid #cbd5e1;
        }
        table.legend-table td.swatch {
            width: 30%;
        }

        @media print {
            body {
                background: #ffffff;
                padding: 0;
            }
            .toolbar {
                display: none !important;
            }
            .sheet {
                width: 100%;
                min-height: 0;
                box-shadow: none;
                border-radius: 0;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <a href="{{ route('projects.show', $project->id) }}" class="btn">← Kembali ke Proyek</a>
        <div class="toolbar-actions">
            <a href="{{ route('projects.timeline.print', ['project' => $project->id, 'download' => 1]) }}" class="btn btn-primary">
                ⬇ Download PDF (A4)
            </a>
            <button type="button" onclick="window.print()" class="btn btn-dark">
                🖨 Cetak Browser
            </button>
        </div>
    </div>

    <div class="sheet">
        <div class="header">
            <div>
                @if(!empty($logoDataUri))
                    <img src="{{ $logoDataUri }}" alt="RIM Projects" class="brand-logo">
                @elseif(!empty($office->company_logo_url))
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
                    <td>: <strong>{{ strtoupper($project->client_name) }}</strong></td>
                </tr>
                <tr>
                    <td class="label">PROJECT NAME</td>
                    <td>: {{ $project->name }}</td>
                </tr>
                <tr>
                    <td class="label">PAKET LAYANAN</td>
                    <td>: {{ $project->package_name ?: ($project->category ?: 'Paket Perencanaan') }}@if($project->building_area) ({{ number_format((float) $project->building_area, 0) }} m²)@endif</td>
                </tr>
                <tr>
                    <td class="label">DATE START</td>
                    <td>: {{ $project->start_date ? $project->start_date->translatedFormat('d F Y') : '-' }}</td>
                </tr>
            </table>
            <div class="doc-date">
                Dokumen Pertanggal<br>{{ now()->translatedFormat('d F Y') }}
            </div>
        </div>

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
                        <td style="font-weight: 600;">{{ $stage->name }}</td>
                        <td>{{ $stage->update_design_date ? $stage->update_design_date->translatedFormat('d F Y') : '-' }}</td>
                        <td>{{ $stage->client_response_date ? $stage->client_response_date->translatedFormat('d F Y') : '-' }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="3" style="text-align:center; color:#64748b; padding: 14px;">Belum ada tahapan timeline yang diatur.</td>
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
                            <td style="font-weight: 600;">{{ $row['name'] }}</td>
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
