<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $templateTitle }} — {{ $project->name }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 16mm 14mm 16mm 14mm;
        }
        @page :first {
            margin: 0;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: DejaVu Sans, Helvetica, Arial, sans-serif;
            color: #1c2426;
            font-size: 9.5pt;
            line-height: 1.45;
            margin: 0;
            padding: 0;
        }

        /* RUNNING HEADER & FOOTER FOR CONTENT PAGES */
        .pdf-header {
            position: fixed;
            top: -11mm;
            left: 0;
            right: 0;
            height: 8mm;
            border-bottom: 1.5pt solid #46797b;
            font-size: 7.5pt;
            color: #46797b;
        }
        .pdf-header table {
            width: 100%;
            border-collapse: collapse;
        }
        .pdf-footer {
            position: fixed;
            bottom: -11mm;
            left: 0;
            right: 0;
            height: 7mm;
            border-top: 0.5pt solid #cbd8da;
            padding-top: 2mm;
            font-size: 7.5pt;
            color: #64748b;
        }
        .pdf-footer table {
            width: 100%;
            border-collapse: collapse;
        }
        .page-num:before {
            content: "Halaman " counter(page);
        }

        /* COVER PAGE (EXACT 1 A4 PAGE) */
        .cover-page {
            position: relative;
            width: 210mm;
            height: 296mm;
            background: #ffffff;
            page-break-after: always;
            z-index: 10;
        }
        .cover-banner {
            background: #1f3d40;
            padding: 14mm 16mm 12mm 16mm;
            border-bottom: 4pt solid #46797b;
            color: #ffffff;
        }
        .cover-banner table {
            width: 100%;
            border-collapse: collapse;
        }
        .cover-logo-box {
            display: inline-block;
            background: #ffffff;
            padding: 5pt 10pt;
            border-radius: 6pt;
        }
        .cover-logo {
            height: 26pt;
            width: auto;
        }
        .cover-doc-tag {
            font-size: 8.5pt;
            font-weight: bold;
            letter-spacing: 1.2pt;
            text-transform: uppercase;
            color: #d6ecec;
            text-align: right;
        }
        .cover-body {
            padding: 16mm 16mm 12mm 16mm;
        }
        .cover-accent {
            width: 44pt;
            height: 4pt;
            background: #46797b;
            margin-bottom: 14pt;
        }
        .cover-title {
            font-size: 32pt;
            font-weight: bold;
            line-height: 1.05;
            color: #162224;
            margin: 0;
        }
        .cover-subtitle {
            font-size: 22pt;
            font-weight: normal;
            letter-spacing: 2pt;
            color: #46797b;
            margin: 6pt 0 0 0;
        }
        .cover-meta-box {
            margin-top: 22pt;
            background: #f4f9f9;
            border: 1pt solid #d5e5e5;
            border-left: 4pt solid #46797b;
            padding: 12pt 14pt;
        }
        .cover-meta-table {
            width: 100%;
            border-collapse: collapse;
        }
        .cover-meta-table td {
            width: 50%;
            vertical-align: top;
            padding: 5pt 8pt 5pt 0;
        }
        .meta-label {
            font-size: 7.5pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.7pt;
            color: #5b7476;
            margin-bottom: 2pt;
        }
        .meta-value {
            font-size: 10.5pt;
            font-weight: bold;
            color: #162224;
        }
        .cover-toc-title {
            margin-top: 22pt;
            margin-bottom: 8pt;
            font-size: 8pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.9pt;
            color: #46797b;
        }
        .cover-toc-table {
            width: 100%;
            border-collapse: collapse;
        }
        .cover-toc-table td {
            width: 50%;
            padding: 4pt 8pt 4pt 0;
            font-size: 9.5pt;
            color: #2c3d40;
            vertical-align: middle;
        }
        .toc-badge {
            display: inline-block;
            width: 16pt;
            height: 16pt;
            line-height: 16pt;
            text-align: center;
            background: #e6f0f0;
            color: #46797b;
            font-size: 8pt;
            font-weight: bold;
            border-radius: 8pt;
            margin-right: 6pt;
        }
        .cover-footer-box {
            position: absolute;
            left: 16mm;
            right: 16mm;
            bottom: 16mm;
            border-top: 1.5pt solid #1c2426;
            border-bottom: 1.5pt solid #1c2426;
            padding: 10pt 0;
            font-size: 8.5pt;
            color: #3a4a4d;
            line-height: 1.45;
        }

        /* CONTENT SECTIONS */
        .section-block {
            margin-bottom: 12pt;
        }
        .section-heading {
            background: #46797b;
            color: #ffffff;
            padding: 5pt 9pt;
            font-size: 9.5pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.6pt;
            margin-bottom: 8pt;
            page-break-after: avoid;
        }
        .section-num {
            display: inline-block;
            background: #2f5759;
            padding: 1pt 5pt;
            font-size: 8pt;
            margin-right: 6pt;
        }
        .field-row {
            margin-bottom: 8pt;
            page-break-inside: avoid;
        }
        .inline-table {
            width: 100%;
            border-collapse: collapse;
        }
        .inline-table td {
            padding: 2.5pt 0;
            vertical-align: bottom;
        }
        .inline-label {
            width: 36%;
            font-weight: bold;
            color: #243336;
            font-size: 9pt;
            padding-right: 6pt;
        }
        .inline-colon {
            width: 2%;
            color: #243336;
        }
        .inline-val {
            width: 62%;
            border-bottom: 0.8pt dotted #8fa3a7;
            color: #0f172a;
            font-size: 9pt;
            padding-left: 4pt;
            padding-bottom: 1pt;
        }
        .field-block-label {
            font-weight: bold;
            color: #243336;
            font-size: 9pt;
            margin-bottom: 4pt;
        }
        .field-help {
            font-size: 8pt;
            color: #64748b;
            font-style: italic;
        }
        .answer-box {
            border: 0.8pt solid #cbd7d9;
            background: #fbfdfd;
            padding: 6pt 8pt;
            min-height: 28pt;
            font-size: 9pt;
            color: #0f172a;
        }
        .blank-line {
            border-bottom: 0.8pt solid #94a6aa;
            height: 17pt;
            width: 100%;
        }

        /* CHECKLIST TABLE */
        .checklist-box {
            background: #f8fbfb;
            border: 0.8pt solid #dce8e8;
            padding: 5pt 8pt;
        }
        .checklist-table {
            width: 100%;
            border-collapse: collapse;
        }
        .checklist-table td {
            width: 50%;
            padding: 2.5pt 6pt 2.5pt 0;
            font-size: 8.8pt;
            vertical-align: middle;
        }
        .chk {
            display: inline-block;
            width: 9pt;
            height: 9pt;
            line-height: 9pt;
            text-align: center;
            border: 1pt solid #46797b;
            background: #ffffff;
            color: #ffffff;
            font-size: 7.5pt;
            font-weight: bold;
            margin-right: 5pt;
            vertical-align: middle;
        }
        .chk-on {
            background: #46797b;
            color: #ffffff;
        }

        /* SURVEY TABLE */
        .survey-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 3pt;
            font-size: 8.8pt;
        }
        .survey-table th {
            background: #eaf2f2;
            color: #1c2426;
            font-weight: bold;
            text-align: left;
            padding: 4.5pt 6pt;
            border: 0.8pt solid #bfd0d2;
        }
        .survey-table td {
            padding: 4.5pt 6pt;
            border: 0.8pt solid #cbd8da;
            height: 16pt;
        }
        .survey-table tr {
            page-break-inside: avoid;
        }

        /* PHOTOS */
        .photo-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4pt;
        }
        .photo-table td {
            width: 33.33%;
            padding: 3pt;
            vertical-align: top;
        }
        .photo-card {
            border: 0.8pt solid #d5e0e1;
            background: #f8fafc;
            padding: 3pt;
            text-align: center;
        }
        .photo-card img {
            max-width: 100%;
            max-height: 80pt;
        }
        .photo-caption {
            font-size: 7.5pt;
            color: #475569;
            margin-top: 2pt;
        }

        /* SIGNATURE BLOCK */
        .signature-block {
            margin-top: 18pt;
            padding-top: 12pt;
            border-top: 1.5pt solid #46797b;
            page-break-inside: avoid;
        }
        .signature-table {
            width: 100%;
            border-collapse: collapse;
        }
        .signature-table td {
            width: 50%;
            text-align: center;
            padding: 0 24pt;
            vertical-align: top;
        }
        .sig-title {
            font-size: 8.5pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
            color: #243336;
        }
        .sig-space {
            height: 48pt;
        }
        .sig-line {
            border-top: 0.8pt solid #1c2426;
            padding-top: 4pt;
            font-size: 9pt;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <!-- RUNNING HEADER & FOOTER (Displayed on Page 2+) -->
    <div class="pdf-header">
        <table>
            <tr>
                <td style="font-weight: bold; color: #162224;">{{ strtoupper($templateTitle) }}</td>
                <td style="text-align: right;">{{ $office->office_name ?: 'RIM Studio Arsitektur' }} &middot; {{ $project->name }}</td>
            </tr>
        </table>
    </div>

    <div class="pdf-footer">
        <table>
            <tr>
                <td>{{ $office->office_name ?: 'RIM Studio Arsitektur' }} — Dokumen Formulir Informasi Klien</td>
                <td style="text-align: right;"><span class="page-num"></span></td>
            </tr>
        </table>
    </div>

    <!-- PAGE 1: COVER DOCUMENT -->
    <div class="cover-page">
        <div class="cover-banner">
            <table>
                <tr>
                    <td style="width: 45%; vertical-align: middle;">
                        @if(!empty($logoDataUri))
                            <div class="cover-logo-box">
                                <img src="{{ $logoDataUri }}" alt="{{ $office->office_name }}" class="cover-logo">
                            </div>
                        @else
                            <strong style="font-size: 14pt; color: #ffffff;">{{ $office->office_name ?: 'RIM Studio Arsitektur' }}</strong>
                        @endif
                    </td>
                    <td class="cover-doc-tag" style="width: 55%; vertical-align: middle;">
                        {{ strtoupper($templateTitle) }}
                    </td>
                </tr>
            </table>
        </div>

        <div class="cover-body">
            <div class="cover-accent"></div>
            <h1 class="cover-title">
                @if($isInterior)
                    INTERIOR<br>DESIGNER
                @else
                    ARCHITECTURAL<br>DESIGNER
                @endif
            </h1>
            <p class="cover-subtitle">DOCUMENTS</p>

            <div class="cover-meta-box">
                <table class="cover-meta-table">
                    <tr>
                        <td>
                            <div class="meta-label">Nama Proyek</div>
                            <div class="meta-value">{{ $project->name }}</div>
                        </td>
                        <td>
                            <div class="meta-label">Nama Klien</div>
                            <div class="meta-value">{{ $project->client_name }}</div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div class="meta-label">Paket / Kategori</div>
                            <div class="meta-value">{{ $project->package_name ?: $project->category }} &middot; {{ \App\Models\Project::BUILDING_TYPES[$buildingType] ?? 'Rumah Hunian' }}</div>
                        </td>
                        <td>
                            <div class="meta-label">Mode Dokumen</div>
                            <div class="meta-value">{{ $mode === 'blank' ? 'Blanko Survey & Wawancara Lapangan' : 'Data Eksisting Terisi' }} &middot; {{ now()->translatedFormat('d F Y') }}</div>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="cover-toc-title">Ruang Lingkup Formulir</div>
            @php
                $secKeys = array_keys($sections);
                $secRows = array_chunk($secKeys, 2, true);
            @endphp
            <table class="cover-toc-table">
                @foreach($secRows as $pair)
                    <tr>
                        @foreach($pair as $secIdx => $secTitle)
                            <td>
                                <span class="toc-badge">{{ $secIdx + 1 }}</span>{{ $secTitle }}
                            </td>
                        @endforeach
                        @if(count($pair) === 1)
                            <td></td>
                        @endif
                    </tr>
                @endforeach
            </table>
        </div>

        <div class="cover-footer-box">
            <strong>Catatan Transparansi:</strong> Untuk membantu tim {{ $office->office_name ?: 'RIM Studio Arsitektur' }} merancang proyek yang sesuai dengan kebutuhan dan preferensi Anda, mohon isi formulir ini dengan detail dan jelaskan secara terbuka setiap kebutuhan atau preferensi khusus yang Anda miliki.
        </div>
    </div>

    <!-- PAGE 2+: FORM CONTENT -->
    @php $sectionIndex = 0; @endphp
    @foreach($sections as $sectionName => $sectionFields)
        @php $sectionIndex++; @endphp
        <div class="section-block">
            <div class="section-heading">
                <span class="section-num">{{ str_pad((string) $sectionIndex, 2, '0', STR_PAD_LEFT) }}</span>{{ $sectionName }}
            </div>

            @foreach($sectionFields as $field)
                @php
                    $key = $field['key'];
                    $type = $field['type'];
                    $val = $responses[$key] ?? null;
                    $isBlank = $mode === 'blank';
                @endphp

                <div class="field-row">
                    @if(in_array($type, ['text', 'number', 'url', 'compass'], true))
                        @php
                            $displayVal = is_array($val) ? implode(', ', array_filter(array_map('strval', $val))) : (string) ($val ?? '');
                        @endphp
                        <table class="inline-table">
                            <tr>
                                <td class="inline-label">{{ $field['label'] }}</td>
                                <td class="inline-colon">:</td>
                                <td class="inline-val">{{ !$isBlank && $displayVal !== '' ? $displayVal : '' }}</td>
                            </tr>
                        </table>
                    @elseif($type === 'select')
                        <div class="field-block-label">{{ $field['label'] }}</div>
                        @php $optChunks = array_chunk($field['options'] ?? [], 2); @endphp
                        <div class="checklist-box">
                            <table class="checklist-table">
                                @foreach($optChunks as $pair)
                                    <tr>
                                        @foreach($pair as $opt)
                                            @php $checked = !$isBlank && (string) $val === (string) $opt; @endphp
                                            <td>
                                                <span class="chk {{ $checked ? 'chk-on' : '' }}">{{ $checked ? 'v' : '' }}</span>{{ $opt }}
                                            </td>
                                        @endforeach
                                        @if(count($pair) === 1)
                                            <td></td>
                                        @endif
                                    </tr>
                                @endforeach
                            </table>
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
                            @php
                                $selectedArr = is_array($val) ? $val : [];
                                $optChunks = array_chunk($field['options'] ?? [], 2);
                            @endphp
                            <div class="checklist-box">
                                <table class="checklist-table">
                                    @foreach($optChunks as $pair)
                                        <tr>
                                            @foreach($pair as $opt)
                                                @php $checked = !$isBlank && in_array($opt, $selectedArr, true); @endphp
                                                <td>
                                                    <span class="chk {{ $checked ? 'chk-on' : '' }}">{{ $checked ? 'v' : '' }}</span>{{ $opt }}
                                                </td>
                                            @endforeach
                                            @if(count($pair) === 1)
                                                <td></td>
                                            @endif
                                        </tr>
                                    @endforeach
                                </table>
                            </div>
                        @endif
                    @elseif($type === 'maps')
                        <table class="inline-table">
                            <tr>
                                <td class="inline-label">{{ $field['label'] }}</td>
                                <td class="inline-colon">:</td>
                                <td class="inline-val">
                                    @if(!$isBlank && is_array($val))
                                        {{ $val['url'] ?? (isset($val['lat'], $val['lng']) ? "{$val['lat']}, {$val['lng']}" : '') }}
                                    @endif
                                </td>
                            </tr>
                        </table>
                    @elseif($type === 'files')
                        <div class="field-block-label">{{ $field['label'] }}</div>
                        @if(!$isBlank && is_array($val) && count($val) > 0)
                            @php $photoRows = array_chunk($val, 3); @endphp
                            <table class="photo-table">
                                @foreach($photoRows as $pRow)
                                    <tr>
                                        @foreach($pRow as $file)
                                            @php
                                                $url = is_array($file) ? ($file['url'] ?? '') : '';
                                                $name = is_array($file) ? ($file['name'] ?? 'Lampiran') : 'Lampiran';
                                                $absPath = $url ? public_path(ltrim($url, '/')) : '';
                                                $isImg = $absPath && is_file($absPath) && preg_match('/\.(jpe?g|png|gif)$/i', $absPath);
                                                $imgData = $isImg ? ('data:'.(mime_content_type($absPath) ?: 'image/jpeg').';base64,'.base64_encode((string) file_get_contents($absPath))) : null;
                                            @endphp
                                            <td>
                                                <div class="photo-card">
                                                    @if($imgData)
                                                        <img src="{{ $imgData }}" alt="{{ $name }}">
                                                    @endif
                                                    <div class="photo-caption">{{ $name }}</div>
                                                </div>
                                            </td>
                                        @endforeach
                                        @for($pad = count($pRow); $pad < 3; $pad++)
                                            <td></td>
                                        @endfor
                                    </tr>
                                @endforeach
                            </table>
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
                            <div class="blank-line"></div>
                            <div class="blank-line"></div>
                        @else
                            @php
                                $textVal = is_array($val) ? implode(', ', array_filter(array_map('strval', $val))) : (string) ($val ?? '');
                            @endphp
                            <div class="answer-box">{!! nl2br(e($textVal !== '' ? $textVal : '—')) !!}</div>
                        @endif
                    @endif
                </div>
            @endforeach
        </div>
    @endforeach

    <!-- SIGNATURE BLOCK -->
    <div class="signature-block">
        <table class="signature-table">
            <tr>
                <td>
                    <div class="sig-title">Persetujuan Klien</div>
                    <div class="sig-space"></div>
                    <div class="sig-line">{{ $project->client_name }}</div>
                </td>
                <td>
                    <div class="sig-title">Tim Survey / Arsitek</div>
                    <div class="sig-space"></div>
                    <div class="sig-line">{{ $office->office_name ?: 'RIM Studio Arsitektur' }}</div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
