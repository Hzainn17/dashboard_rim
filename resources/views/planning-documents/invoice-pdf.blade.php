<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Invoice — {{ $refNo }}</title>
    <style>
        @page { margin: 14mm 15mm; }
        body { font-family: Helvetica, Arial, sans-serif; color: #1f2937; font-size: 10.5px; line-height: 1.45; }
        table { width: 100%; border-collapse: collapse; }
        .header-table td { vertical-align: top; }
        .doc-title { font-size: 20px; font-weight: bold; letter-spacing: 1.2px; color: #111827; text-align: right; }
        .address-box { font-size: 9px; color: #4b5563; text-align: right; margin-top: 4px; line-height: 1.4; }
        .divider { border-top: 2px solid #2d5a5c; margin: 12px 0; }
        .meta-table td { padding: 2.5px 4px; vertical-align: top; font-size: 10px; }
        .meta-label { width: 115px; font-weight: bold; color: #374151; }
        .items-table { margin-top: 14px; }
        .items-table th { background: #2d5a5c; color: #ffffff; padding: 7px 8px; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.4px; text-align: left; }
        .items-table th.right, .items-table td.right { text-align: right; }
        .items-table th.center, .items-table td.center { text-align: center; }
        .items-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 10px; }
        .summary-table { margin-top: 12px; }
        .summary-table td { padding: 5px 8px; font-size: 10px; }
        .paid-row td { background: #ecfdf5; color: #065f46; }
        .due-row td { font-weight: bold; font-size: 11px; background: #2d5a5c; color: #ffffff; padding: 8px; }
        .footer-grid { margin-top: 26px; }
        .bank-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px 12px; border-radius: 4px; font-size: 9.2px; }
        .bank-box h4 { margin: 0 0 5px; font-size: 9.5px; color: #2d5a5c; letter-spacing: 0.4px; }
        .sig-box { text-align: center; font-size: 10px; }
        .sig-space { height: 54px; }
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
                <div class="doc-title">INVOICE</div>
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
            <td class="meta-label">INVOICE NO.</td>
            <td style="width: 10px;">:</td>
            <td><strong>{{ $refNo }}</strong></td>
            <td class="meta-label" style="text-align: right; width: 125px;">TAHAP PEMBAYARAN</td>
            <td style="width: 10px;">:</td>
            <td style="width: 140px;"><strong>{{ $targetStage['label'] }}</strong></td>
        </tr>
        <tr>
            <td class="meta-label">BILL TO</td>
            <td>:</td>
            <td><strong>{{ $quote->client_name }}</strong></td>
            <td class="meta-label" style="text-align: right;">DATE</td>
            <td>:</td>
            <td>{{ $invoiceDate->format('d-M-Y') }}</td>
        </tr>
        <tr>
            <td class="meta-label">NO. WHATSAPP</td>
            <td>:</td>
            <td>{{ $quote->client_phone ?: '-' }}</td>
            <td colspan="3"></td>
        </tr>
        <tr>
            <td class="meta-label">PROJECT NAME</td>
            <td>:</td>
            <td colspan="4">{{ $quote->project_title }}</td>
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 52%;">Description</th>
                <th class="center" style="width: 12%;">Area / Qty</th>
                <th class="right" style="width: 18%;">Price</th>
                <th class="right" style="width: 18%;">Total</th>
            </tr>
        </thead>
        <tbody>
            @if ($targetStage['key'] === 'survey')
                <tr>
                    <td>
                        <strong>Biaya Survey Lokasi Proyek</strong><br>
                        Kunjungan pengukuran lahan &amp; pengumpulan data eksisting untuk proyek {{ $quote->project_title }}
                    </td>
                    <td class="center">Ls</td>
                    <td class="right">Rp {{ number_format($targetStage['amount'], 0, ',', '.') }}</td>
                    <td class="right"><strong>Rp {{ number_format($targetStage['amount'], 0, ',', '.') }}</strong></td>
                </tr>
            @else
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
            @endif
        </tbody>
    </table>

    <table class="summary-table">
        @if ($targetStage['key'] !== 'survey')
            @if ($quote->discount_amount > 0)
                <tr>
                    <td style="width: 68%; text-align: right; color: #b91c1c;">
                        DISKON {{ $quote->discount_type === 'percent' ? "({$quote->discount_value}%)" : '' }}
                    </td>
                    <td style="width: 32%; text-align: right; color: #b91c1c;">- Rp {{ number_format($quote->discount_amount, 0, ',', '.') }}</td>
                </tr>
            @endif
            <tr style="font-weight: bold; background: #f3f7f7;">
                <td style="width: 68%; text-align: right;">TOTAL NILAI KONTRAK DESAIN</td>
                <td style="width: 32%; text-align: right;">Rp {{ number_format($quote->effectiveDesignValue(), 0, ',', '.') }}</td>
            </tr>
            @foreach ($allStages as $st)
                @if ($st['key'] !== 'survey')
                    <tr class="{{ $st['is_paid'] ? 'paid-row' : '' }}">
                        <td style="text-align: right;">
                            {{ strtoupper($st['label']) }}
                            @if ($st['is_paid'])
                                — [PAID] ({{ $st['paid_at_formatted'] }})
                            @endif
                        </td>
                        <td style="text-align: right;">Rp {{ number_format($st['amount'], 0, ',', '.') }}</td>
                    </tr>
                @endif
            @endforeach
        @endif

        <tr class="due-row">
            <td style="text-align: right;">
                TOTAL TAGIHAN JATUH TEMPO SAAT INI ({{ strtoupper($targetStage['label']) }})
            </td>
            <td style="text-align: right;">Rp {{ number_format($targetStage['amount'], 0, ',', '.') }}</td>
        </tr>
    </table>

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
