<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Surat Penawaran — {{ $refNo }}</title>
    <style>
        @page { margin: 14mm 15mm; }
        body { font-family: Helvetica, Arial, sans-serif; color: #1f2937; font-size: 10.5px; line-height: 1.45; }
        table { width: 100%; border-collapse: collapse; }
        .header-table td { vertical-align: top; }
        .doc-title { font-size: 18px; font-weight: bold; letter-spacing: 1px; color: #111827; text-align: right; }
        .address-box { font-size: 9px; color: #4b5563; text-align: right; margin-top: 4px; line-height: 1.4; }
        .divider { border-top: 2px solid #2d5a5c; margin: 12px 0; }
        .meta-table td { padding: 2px 4px; vertical-align: top; font-size: 10px; }
        .meta-label { width: 105px; font-weight: bold; color: #374151; }
        .intro { margin: 14px 0 12px; text-align: justify; font-size: 10.2px; }
        .items-table { margin-top: 8px; }
        .items-table th { background: #2d5a5c; color: #ffffff; padding: 7px 8px; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.4px; text-align: left; }
        .items-table th.right, .items-table td.right { text-align: right; }
        .items-table th.center, .items-table td.center { text-align: center; }
        .items-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 10px; }
        .summary-table { margin-top: 10px; }
        .summary-table td { padding: 4px 8px; font-size: 10px; }
        .summary-row-strong td { font-weight: bold; background: #f3f7f7; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
        .balance-row td { font-weight: bold; font-size: 11px; background: #2d5a5c; color: #ffffff; padding: 7px 8px; }
        .closing { margin-top: 14px; text-align: justify; font-size: 10px; }
        .footer-grid { margin-top: 22px; }
        .bank-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px 12px; border-radius: 4px; font-size: 9.2px; }
        .bank-box h4 { margin: 0 0 5px; font-size: 9.5px; color: #2d5a5c; letter-spacing: 0.4px; }
        .sig-box { text-align: center; font-size: 10px; }
        .sig-space { height: 52px; }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td style="width: 42%;">
                @if ($logoDataUri)
                    <img src="{{ $logoDataUri }}" alt="RIM Projects" style="height: 46px; width: auto;">
                @else
                    <div style="font-size: 18px; font-weight: bold; color: #2d5a5c;">RIM PROJECTS</div>
                @endif
            </td>
            <td style="width: 58%;">
                <div class="doc-title">
                    {{ $quote->document_kind === 'addendum' ? 'SURAT PENAWARAN ADENDUM' : 'SURAT PENAWARAN' }}
                </div>
                <div class="address-box">
                    <strong>ADDRESS</strong><br>
                    Jl. Edelweiss Blok D2. 4 Komplek Permata Biru<br>
                    Desa Cinunuk, Kec. Cileunyi, Kota Bandung, Jawa Barat 40624<br>
                    0821-1857-0531 &nbsp;|&nbsp; @rimprojects89_ &nbsp;|&nbsp; rimprojects89@gmail.com
                </div>
            </td>
        </tr>
    </table>

    <div class="divider"></div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">BILL TO</td>
            <td style="width: 10px;">:</td>
            <td><strong>{{ $quote->client_name }}</strong></td>
            <td class="meta-label" style="text-align: right;">DATE</td>
            <td style="width: 10px;">:</td>
            <td style="width: 130px;">{{ $quote->quote_date->format('d-M-Y') }}</td>
        </tr>
        <tr>
            <td class="meta-label">PROJECT NAME</td>
            <td>:</td>
            <td>{{ $quote->project_title }}</td>
            <td class="meta-label" style="text-align: right;">REF NO.</td>
            <td>:</td>
            <td><strong>{{ $refNo }}</strong></td>
        </tr>
        @if ($quote->client_phone)
            <tr>
                <td class="meta-label">NO. WHATSAPP</td>
                <td>:</td>
                <td>{{ $quote->client_phone }}</td>
                <td colspan="3"></td>
            </tr>
        @endif
    </table>

    <div class="intro">
        Dengan Hormat,<br><br>
        @if ($quote->intro_notes)
            {!! nl2br(e($quote->intro_notes)) !!}
        @else
            Sehubungan dengan rencana pekerjaan perancangan <strong>{{ $quote->project_title }}</strong>
            @if (! empty($quote->floor_breakdown))
                ({{ count($quote->floor_breakdown) }} lantai:
                @foreach ($quote->floor_breakdown as $fl)
                    {{ $fl['label'] }} {{ rtrim(rtrim(number_format($fl['area'], 2, '.', ''), '0'), '.') }} m²{{ ! $loop->last ? ', ' : '' }}
                @endforeach
                — Total Luas Aktual {{ rtrim(rtrim(number_format($quote->actual_area ?? 0, 2, '.', ''), '0'), '.') }} m²)
            @elseif ($quote->actual_area)
                (luasan aktual {{ rtrim(rtrim(number_format($quote->actual_area, 2, '.', ''), '0'), '.') }} m²)
            @endif
            , kami dari <strong>RIM Projects</strong> bermaksud mengajukan penawaran jasa konsultan perencanaan arsitektur &amp; desain. Adapun rincian penawaran dari kami adalah sebagai berikut:
        @endif
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 50%;">Description</th>
                <th class="center" style="width: 14%;">Total Area</th>
                <th class="right" style="width: 18%;">Price</th>
                <th class="right" style="width: 18%;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($quote->items as $item)
                <tr>
                    <td>{!! nl2br(e($item->description)) !!}</td>
                    <td class="center">
                        @if ($item->unit_type === 'ls')
                            Ls
                        @else
                            {{ rtrim(rtrim(number_format($item->quantity, 2, '.', ''), '0'), '.') }} m²
                        @endif
                    </td>
                    <td class="right">Rp {{ number_format($item->unit_price, 0, ',', '.') }}</td>
                    <td class="right"><strong>Rp {{ number_format($item->total_price, 0, ',', '.') }}</strong></td>
                </tr>
            @endforeach
            @if ($quote->survey_mode === 'included' && $quote->survey_fee > 0)
                <tr>
                    <td>
                        <strong>Biaya Survey Lokasi Proyek</strong><br>
                        Kunjungan pengukuran lahan &amp; data eksisting (dibayarkan di awal setelah survey selesai)
                    </td>
                    <td class="center">Ls</td>
                    <td class="right">Rp {{ number_format($quote->survey_fee, 0, ',', '.') }}</td>
                    <td class="right"><strong>Rp {{ number_format($quote->survey_fee, 0, ',', '.') }}</strong></td>
                </tr>
            @endif
        </tbody>
    </table>

    <table class="summary-table">
        <tr>
            <td style="width: 65%; text-align: right;">SUBTOTAL</td>
            <td style="width: 35%; text-align: right;">
                Rp {{ number_format($quote->subtotal_amount + ($quote->survey_mode === 'included' ? $quote->survey_fee : 0), 0, ',', '.') }}
            </td>
        </tr>
        @if ($quote->discount_amount > 0)
            <tr>
                <td style="text-align: right; color: #b91c1c;">
                    DISKON {{ $quote->discount_type === 'percent' ? "({$quote->discount_value}%)" : '' }}
                </td>
                <td style="text-align: right; color: #b91c1c;">- Rp {{ number_format($quote->discount_amount, 0, ',', '.') }}</td>
            </tr>
        @endif
        @if ($quote->agreed_contract_value && $quote->agreed_contract_value > 0)
            <tr>
                <td style="text-align: right; color: #065f46;"><strong>HARGA DEAL / NILAI KONTRAK JADI (DESAIN)</strong></td>
                <td style="text-align: right; color: #065f46;"><strong>Rp {{ number_format($quote->agreed_contract_value, 0, ',', '.') }}</strong></td>
            </tr>
        @endif
        <tr class="summary-row-strong">
            <td style="text-align: right;">TOTAL AMOUNT</td>
            <td style="text-align: right;">Rp {{ number_format($quote->totalBillable(), 0, ',', '.') }}</td>
        </tr>
        @foreach ($stages as $st)
            <tr>
                <td style="text-align: right;">{{ strtoupper($st['label']) }}</td>
                <td style="text-align: right;">Rp {{ number_format($st['amount'], 0, ',', '.') }}</td>
            </tr>
        @endforeach
        <tr class="balance-row">
            <td style="text-align: right;">BALANCE DUE</td>
            <td style="text-align: right;">Rp {{ number_format($quote->totalBillable(), 0, ',', '.') }}</td>
        </tr>
    </table>

    <div class="closing">
        Demikian surat penawaran ini kami sampaikan. Besar harapan kami dapat bekerja sama dan mendampingi proyek tersebut. Atas perhatian, waktu, dan kerja samanya, kami ucapkan terima kasih.
    </div>

    <table class="footer-grid">
        <tr>
            <td style="width: 62%; vertical-align: bottom; padding-right: 14px;">
                <div class="bank-box">
                    <h4>PAYMENT VIA TRANSFER TO</h4>
                    <strong>BANK BNI</strong> : 1852963974 (a.n CV RIM PROJECTS)<br>
                    <strong>BANK BRI</strong> : 0749 0105 1617 533 (a.n Rahman Hakim)<br>
                    <strong>BANK MANDIRI</strong> : 1310016471387 (a.n Rahman Hakim)<br>
                    <strong>BANK BCA</strong> : 7751201790 (a.n Annisa Intan Kencana)
                </div>
            </td>
            <td style="width: 38%; vertical-align: bottom;">
                <div class="sig-box">
                    <strong>FOUNDER</strong><br>
                    <div class="sig-space" style="display: inline-block; position: relative; height: 82px; width: 160px; margin: 6px 0 4px;">
                        @if (! empty($stampDataUri))
                            <img src="{{ $stampDataUri }}" alt="Cap RIM Projects" style="position: absolute; left: 24px; top: 12px; width: 112px; height: 58px; opacity: 0.72;">
                        @endif
                        @if (! empty($signatureDataUri))
                            <img src="{{ $signatureDataUri }}" alt="TTD Rahman Hakim" style="position: absolute; left: 52px; top: 1px; width: 57px; height: 80px;">
                        @endif
                    </div><br>
                    <strong style="border-top: 1px solid #374151; padding-top: 4px; display: inline-block; min-width: 140px;">
                        Rahman Hakim
                    </strong>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
