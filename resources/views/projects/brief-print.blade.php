<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $templateTitle }} — {{ $project->name }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 14mm 15mm 16mm 15mm;
        }
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #e9eef0;
            color: #1c2426;
            margin: 0;
            padding: 24px 16px 48px;
            line-height: 1.5;
            font-size: 11.5px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .toolbar {
            max-width: 820px;
            margin: 0 auto 18px;
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            background: #ffffff;
            padding: 12px 18px;
            border-radius: 12px;
            border: 1px solid #d5e0e1;
            box-shadow: 0 4px 16px rgba(20, 40, 42, 0.06);
        }
        .toolbar-group {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
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
            border: 1px solid #cbd5d8;
            background: #ffffff;
            color: #1c2426;
        }
        .btn:hover { background: #f3f7f7; }
        .btn-primary {
            background: #46797b;
            border-color: #46797b;
            color: #ffffff;
        }
        .btn-primary:hover { background: #386264; }
        .btn-active {
            background: #1c2426;
            border-color: #1c2426;
            color: #ffffff;
        }

        .page {
            max-width: 820px;
            margin: 0 auto 24px;
            background: #ffffff;
            border-radius: 6px;
            box-shadow: 0 8px 28px rgba(15, 30, 32, 0.08);
            overflow: hidden;
        }

        /* COVER PAGE (Architectural Studio Style) */
        .cover-page {
            min-height: 1080px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
        }
        .cover-banner {
            position: relative;
            height: 220px;
            background: linear-gradient(135deg, #1b2a2c 0%, #2f5456 58%, #46797b 100%);
            padding: 30px 44px;
            color: #ffffff;
        }
        .cover-banner::after {
            content: "";
            position: absolute;
            right: 0;
            bottom: -1px;
            width: 58%;
            height: 76px;
            background: #ffffff;
            clip-path: polygon(10% 0, 100% 0, 100% 100%, 0 100%);
        }
        .cover-top-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .cover-logo-box {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: rgba(255, 255, 255, 0.95);
            padding: 8px 14px;
            border-radius: 10px;
        }
        .cover-logo {
            height: 30px;
            width: auto;
            object-fit: contain;
        }
        .cover-doc-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #d6ecec;
        }
        .cover-body {
            padding: 56px 52px 40px;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .cover-accent-bar {
            width: 56px;
            height: 5px;
            background: #46797b;
            border-radius: 999px;
            margin-bottom: 20px;
        }
        .cover-title {
            font-size: 46px;
            font-weight: 800;
            line-height: 1.03;
            letter-spacing: -0.03em;
            color: #162224;
            margin: 0;
        }
        .cover-subtitle {
            font-size: 36px;
            font-weight: 300;
            letter-spacing: 0.08em;
            color: #46797b;
            margin: 8px 0 0;
        }
        .cover-meta-grid {
            margin-top: 38px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
            background: #f5f9f9;
            border: 1px solid #d9e7e7;
            border-left: 4px solid #46797b;
            border-radius: 10px;
            padding: 18px 22px;
        }
        .meta-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #5b7476;
            margin-bottom: 3px;
        }
        .meta-value {
            font-size: 13px;
            font-weight: 700;
            color: #162224;
        }
        .cover-toc {
            margin-top: 34px;
        }
        .cover-toc-title {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #46797b;
            margin-bottom: 10px;
        }
        .cover-toc-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px 24px;
            list-style: none;
            padding: 0;
            margin: 0;
            font-size: 12px;
            color: #334346;
        }
        .cover-toc-list li {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .cover-toc-num {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #e6f0f0;
            color: #46797b;
            font-size: 10px;
            font-weight: 700;
        }
        .cover-footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1.5px solid #1c2426;
            border-bottom: 1.5px solid #1c2426;
            padding-bottom: 16px;
            font-size: 11px;
            color: #3a4a4d;
        }

        /* CONTENT SHEET */
        .content-sheet {
            padding: 32px 44px 40px;
        }
        .running-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 10px;
            margin-bottom: 22px;
            border-bottom: 2px solid #46797b;
        }
        .running-header-title {
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #162224;
        }
        .running-header-studio {
            font-size: 10.5px;
            font-weight: 600;
            color: #46797b;
        }

        .section-block {
            margin-bottom: 22px;
            page-break-inside: avoid;
        }
        .section-heading {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #ffffff;
            background: #46797b;
            padding: 6px 12px;
            border-radius: 6px;
            margin: 0 0 12px;
        }
        .section-num {
            background: rgba(255, 255, 255, 0.22);
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 10px;
        }

        .field-row {
            margin-bottom: 11px;
            page-break-inside: avoid;
        }
        .field-inline {
            display: grid;
            grid-template-columns: 210px 12px 1fr;
            align-items: baseline;
            gap: 4px;
            padding: 4px 0;
        }
        .field-label {
            font-weight: 600;
            color: #243336;
            font-size: 11.5px;
        }
        .field-value-line {
            border-bottom: 1px dotted #94a6aa;
            min-height: 20px;
            padding: 0 4px 2px;
            color: #0f172a;
            font-weight: 500;
        }
        .field-block-label {
            font-weight: 700;
            color: #243336;
            font-size: 11.5px;
            margin-bottom: 5px;
        }
        .field-help {
            font-size: 10px;
            color: #64748b;
            margin-bottom: 5px;
        }
        .answer-box {
            border: 1px solid #cbd7d9;
            background: #fbfdfd;
            border-radius: 6px;
            padding: 8px 10px;
            min-height: 44px;
            white-space: pre-wrap;
            color: #0f172a;
        }
        .blank-lines {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding-top: 10px;
        }
        .blank-line {
            border-bottom: 1px solid #94a6aa;
            height: 12px;
        }

        .checklist-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px 18px;
            margin-top: 4px;
            padding: 8px 12px;
            background: #f8fbfb;
            border: 1px solid #e2ecec;
            border-radius: 6px;
        }
        .check-item {
            display: flex;
            align-items: center;
            gap: 7px;
            font-size: 11px;
            color: #1c2426;
        }
        .check-box {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 13px;
            height: 13px;
            border: 1.5px solid #46797b;
            border-radius: 3px;
            font-size: 9px;
            font-weight: 800;
            flex-shrink: 0;
            background: #ffffff;
            color: #ffffff;
        }
        .check-box.checked {
            background: #46797b;
            color: #ffffff;
        }

        .survey-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            margin-bottom: 8px;
            font-size: 11px;
        }
        .survey-table th {
            background: #eef4f4;
            color: #1c2426;
            font-weight: 700;
            text-align: left;
            padding: 6px 8px;
            border: 1px solid #bfd0d2;
        }
        .survey-table td {
            padding: 6px 8px;
            border: 1px solid #cbd8da;
            height: 24px;
        }

        .photo-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 6px;
        }
        .photo-card {
            border: 1px solid #d5e0e1;
            border-radius: 6px;
            overflow: hidden;
            background: #f8fafc;
        }
        .photo-card img {
            width: 100%;
            height: 105px;
            object-fit: cover;
            display: block;
        }
        .photo-caption {
            padding: 4px 6px;
            font-size: 9.5px;
            color: #475569;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .signature-section {
            margin-top: 28px;
            padding-top: 18px;
            border-top: 1.5px solid #46797b;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 40px;
            page-break-inside: avoid;
        }
        .signature-box {
            text-align: center;
        }
        .signature-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #243336;
        }
        .signature-space {
            height: 68px;
        }
        .signature-line {
            border-top: 1px solid #1c2426;
            padding-top: 5px;
            font-size: 11px;
            font-weight: 600;
        }

        @media print {
            body {
                background: #ffffff;
                padding: 0;
            }
            .toolbar { display: none !important; }
            .page {
                box-shadow: none;
                border-radius: 0;
                margin: 0;
                max-width: none;
            }
            .cover-page {
                min-height: 264mm;
                page-break-after: always;
            }
            .content-sheet {
                padding: 4mm 2mm;
            }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <div class="toolbar-group">
            <a href="{{ route('projects.show', $project->id) }}" class="btn">← Kembali ke Proyek</a>
            <a href="{{ route('projects.brief.print', ['project' => $project->id, 'mode' => 'blank']) }}"
               class="btn {{ $mode === 'blank' ? 'btn-active' : '' }}">
                Blanko Survey Lapangan
            </a>
            <a href="{{ route('projects.brief.print', ['project' => $project->id, 'mode' => 'filled']) }}"
               class="btn {{ $mode === 'filled' ? 'btn-active' : '' }}">
                Versi Terisi Jawaban
            </a>
        </div>
        <button type="button" onclick="window.print()" class="btn btn-primary">
            Download / Cetak PDF
        </button>
    </div>

    <!-- PAGE 1: COVER DOCUMENT -->
    <div class="page cover-page">
        <div class="cover-banner">
            <div class="cover-top-row">
                <div class="cover-logo-box">
                    <img src="{{ $office->company_logo_url ?: '/rim-projects-logo.png' }}" alt="{{ $office->office_name }}" class="cover-logo">
                </div>
                <div class="cover-doc-tag">{{ strtoupper($templateTitle) }}</div>
            </div>
        </div>

        <div class="cover-body">
            <div>
                <div class="cover-accent-bar"></div>
                <h1 class="cover-title">
                    @if($isInterior)
                        INTERIOR<br>DESIGNER
                    @else
                        ARCHITECTURAL<br>DESIGNER
                    @endif
                </h1>
                <p class="cover-subtitle">DOCUMENTS</p>

                <div class="cover-meta-grid">
                    <div>
                        <div class="meta-label">Nama Proyek</div>
                        <div class="meta-value">{{ $project->name }}</div>
                    </div>
                    <div>
                        <div class="meta-label">Nama Klien</div>
                        <div class="meta-value">{{ $project->client_name }}</div>
                    </div>
                    <div>
                        <div class="meta-label">Paket / Kategori</div>
                        <div class="meta-value">{{ $project->package_name ?: $project->category }} · {{ \App\Models\Project::BUILDING_TYPES[$buildingType] ?? 'Rumah Hunian' }}</div>
                    </div>
                    <div>
                        <div class="meta-label">Mode Dokumen</div>
                        <div class="meta-value">{{ $mode === 'blank' ? 'Blanko Survey & Wawancara Lapangan' : 'Data Eksisting Terisi' }} · {{ now()->translatedFormat('d F Y') }}</div>
                    </div>
                </div>

                <div class="cover-toc">
                    <div class="cover-toc-title">Ruang Lingkup Formulir</div>
                    <ul class="cover-toc-list">
                        @foreach(array_keys($sections) as $secIdx => $secTitle)
                            <li>
                                <span class="cover-toc-num">{{ $secIdx + 1 }}</span>
                                <span>{{ $secTitle }}</span>
                            </li>
                        @endforeach
                    </ul>
                </div>
            </div>

            <div class="cover-footer">
                <strong>Catatan Transparansi:</strong> Untuk membantu tim {{ $office->office_name ?: 'RIM Studio Arsitektur' }} merancang proyek yang sesuai dengan kebutuhan dan preferensi Anda, mohon isi formulir ini dengan detail dan jelaskan secara terbuka setiap kebutuhan atau preferensi khusus yang Anda miliki.
            </div>
        </div>
    </div>

    <!-- PAGE 2+: FORM CONTENT -->
    <div class="page content-sheet">
        <div class="running-header">
            <span class="running-header-title">{{ strtoupper($templateTitle) }}</span>
            <span class="running-header-studio">{{ $office->office_name ?: 'RIM Studio Arsitektur' }} · {{ $project->name }}</span>
        </div>

        @php $sectionIndex = 0; @endphp
        @foreach($sections as $sectionName => $sectionFields)
            @php $sectionIndex++; @endphp
            <div class="section-block">
                <h2 class="section-heading">
                    <span class="section-num">{{ str_pad((string) $sectionIndex, 2, '0', STR_PAD_LEFT) }}</span>
                    <span>{{ $sectionName }}</span>
                </h2>

                @foreach($sectionFields as $field)
                    @php
                        $key = $field['key'];
                        $type = $field['type'];
                        $val = $responses[$key] ?? null;
                        $isBlank = $mode === 'blank';
                    @endphp

                    <div class="field-row">
                        @if(in_array($type, ['text', 'number', 'url', 'compass'], true))
                            <div class="field-inline">
                                <span class="field-label">{{ $field['label'] }}</span>
                                <span>:</span>
                                <span class="field-value-line">
                                    {{ !$isBlank && $val !== null && $val !== '' ? $val : '' }}
                                </span>
                            </div>
                        @elseif($type === 'select')
                            <div class="field-block-label">{{ $field['label'] }}</div>
                            <div class="checklist-grid">
                                @foreach(($field['options'] ?? []) as $opt)
                                    @php $checked = !$isBlank && (string) $val === (string) $opt; @endphp
                                    <div class="check-item">
                                        <span class="check-box {{ $checked ? 'checked' : '' }}">{{ $checked ? '✓' : '' }}</span>
                                        <span>{{ $opt }}</span>
                                    </div>
                                @endforeach
                            </div>
                        @elseif($type === 'multiselect')
                            <div class="field-block-label">{{ $field['label'] }}</div>
                            @if($isBlank && in_array($key, ['ruang_lantai_1', 'ruang_lantai_2'], true))
                                <table class="survey-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 36%;">Ruangan</th>
                                            <th style="width: 18%;">Jumlah</th>
                                            <th>Catatan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach(($field['options'] ?? []) as $opt)
                                            <tr>
                                                <td>{{ $opt }}</td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            @else
                                <div class="checklist-grid">
                                    @php $selectedArr = is_array($val) ? $val : []; @endphp
                                    @foreach(($field['options'] ?? []) as $opt)
                                        @php $checked = !$isBlank && in_array($opt, $selectedArr, true); @endphp
                                        <div class="check-item">
                                            <span class="check-box {{ $checked ? 'checked' : '' }}">{{ $checked ? '✓' : '' }}</span>
                                            <span>{{ $opt }}</span>
                                        </div>
                                    @endforeach
                                </div>
                            @endif
                        @elseif($type === 'maps')
                            <div class="field-inline">
                                <span class="field-label">{{ $field['label'] }}</span>
                                <span>:</span>
                                <span class="field-value-line">
                                    @if(!$isBlank && is_array($val))
                                        {{ $val['url'] ?? (isset($val['lat'], $val['lng']) ? "{$val['lat']}, {$val['lng']}" : '') }}
                                    @endif
                                </span>
                            </div>
                        @elseif($type === 'files')
                            <div class="field-block-label">{{ $field['label'] }}</div>
                            @if(!$isBlank && is_array($val) && count($val) > 0)
                                <div class="photo-grid">
                                    @foreach($val as $file)
                                        @php
                                            $url = is_array($file) ? ($file['url'] ?? '') : '';
                                            $name = is_array($file) ? ($file['name'] ?? 'Lampiran') : 'Lampiran';
                                            $isImg = preg_match('/\.(jpe?g|png|webp|gif)$/i', $url);
                                        @endphp
                                        <div class="photo-card">
                                            @if($isImg)
                                                <img src="{{ $url }}" alt="{{ $name }}">
                                            @endif
                                            <div class="photo-caption">{{ $name }}</div>
                                        </div>
                                    @endforeach
                                </div>
                            @else
                                <div class="field-help">Lampiran foto/dokumen dapat diunggah melalui form digital atau dilampirkan saat survey lapangan.</div>
                            @endif
                        @else
                            <div class="field-block-label">{{ $field['label'] }}</div>
                            @if($isBlank && $key === 'daftar_penghuni')
                                <table class="survey-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 34%;">Nama / Hubungan</th>
                                            <th style="width: 16%;">Umur</th>
                                            <th>Aktivitas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @for($r = 0; $r < 5; $r++)
                                            <tr><td></td><td></td><td></td></tr>
                                        @endfor
                                    </tbody>
                                </table>
                            @elseif($isBlank)
                                <div class="blank-lines">
                                    <div class="blank-line"></div>
                                    <div class="blank-line"></div>
                                </div>
                            @else
                                <div class="answer-box">{{ $val ?: '—' }}</div>
                            @endif
                        @endif
                    </div>
                @endforeach
            </div>
        @endforeach

        <!-- Signature Block -->
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-title">Persetujuan Klien</div>
                <div class="signature-space"></div>
                <div class="signature-line">{{ $project->client_name }}</div>
            </div>
            <div class="signature-box">
                <div class="signature-title">Tim Survey / Arsitek</div>
                <div class="signature-space"></div>
                <div class="signature-line">{{ $office->office_name ?: 'RIM Studio Arsitektur' }}</div>
            </div>
        </div>
    </div>
</body>
</html>
