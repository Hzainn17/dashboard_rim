<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Kwitansi — {{ $refNo }}</title>
    <style>
        @page { margin: 14mm 15mm; }
        body { font-family: Helvetica, Arial, sans-serif; color: #1f2937; font-size: 10.5px; line-height: 1.45; }
        table { width: 100%; border-collapse: collapse; }
        .header-table td { vertical-align: top; }
        .doc-title { font-size: 20px; font-weight: bold; letter-spacing: 1.2px; color: #111827; text-align: right; }
        .address-box { font-size: 9px; color: #4b5563; text-align: right; margin-top: 4px; line-height: 1.4; }
        .divider { border-top: 2px solid #2d5a5c; margin: 12px 0; }
        .meta-table td { padding: 3px 4px; vertical-align: top; font-size: 10px; }
        .meta-label { width: 115px; font-weight: bold; color: #374151; }
        .amount-box { margin-top: 16px; border: 2px solid #2d5a5c; border-radius: 6px; padding: 14px 16px; background: #f3f8f8; }
        .amount-label { font-size: 9.5px; font-weight: bold; letter-spacing: 0.6px; color: #2d5a5c; text-transform: uppercase; }
        .amount-value { font-size: 22px; font-weight: bold; color: #111827; margin-top: 4px; }
        .terbilang-box { margin-top: 10px; padding: 8px 12px; background: #ffffff; border: 1px dashed #94a3b8; font-style: italic; font-weight: bold; color: #1f2937; font-size: 10.5px; }
        .desc-box { margin-top: 14px; border: 1px solid #d1d5db; border-radius: 4px; padding: 12px 14px; background: #ffffff; }
        .desc-label { font-size: 9px; font-weight: bold; color: #6b7280; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 4px; }
        .paid-stamp { display: inline-block; margin-top: 8px; padding: 3px 10px; background: #d1fae5; color: #065f46; border: 1px solid #10b981; border-radius: 4px; font-size: 9.5px; font-weight: bold; letter-spacing: 0.5px; }
        .footer-grid { margin-top: 28px; }
        .contact-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px 12px; border-radius: 4px; font-size: 9.5px; color: #374151; }
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
                <div class="doc-title">KWITANSI</div>
                <div class="address-box">
                    <strong>ADDRESS</strong><br>
                    Jl. Edelweiss Blok D2. 4 Komplek Permata Biru<br>
                    Desa Cinunuk, Kec. Cileunyi, Kota Bandung, Jawa Barat 40624
                </div>
            </td>
        </tr>
    </table>

    <div class="divider"></div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">NO. KWITANSI</td>
            <td style="width: 10px;">:</td>
            <td><strong>{{ $refNo }}</strong></td>
            <td class="meta-label" style="text-align: right; width: 125px;">TAHAP PEMBAYARAN</td>
            <td style="width: 10px;">:</td>
            <td style="width: 140px;"><strong>{{ $targetStage['label'] }}</strong></td>
        </tr>
        <tr>
            <td class="meta-label">RECEIVED FROM</td>
            <td>:</td>
            <td><strong>{{ $quote->client_name }}</strong></td>
            <td class="meta-label" style="text-align: right;">DATE</td>
            <td>:</td>
            <td>{{ $paidDate->format('d-M-Y') }}</td>
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

    <div class="amount-box">
        <div class="amount-label">JUMLAH PEMBAYARAN</div>
        <div class="amount-value">Rp {{ number_format($targetStage['amount'], 0, ',', '.') }}</div>
        <div class="terbilang-box">
            --- {{ $terbilang }} ---
        </div>
    </div>

    <div class="desc-box">
        <div class="desc-label">DESCRIPTION</div>
        <div>
            @if ($targetStage['key'] === 'survey')
                Pembayaran <strong>Biaya Survey Lokasi</strong> untuk Proyek <strong>{{ $quote->project_title }}</strong>
            @else
                Pembayaran Biaya Perencanaan Arsitektur Tahap <strong>{{ $targetStage['label'] }}</strong>
                untuk Proyek <strong>{{ $quote->project_title }}</strong>
            @endif
        </div>
        <div class="paid-stamp">
            PAID · {{ $paidDate->format('d-M-Y') }}
        </div>
    </div>

    <table class="footer-grid">
        <tr>
            <td style="width: 55%; vertical-align: bottom; padding-right: 14px;">
                <div class="contact-box">
                    <strong style="color: #2d5a5c;">CONTACT STUDIO</strong><br>
                    WhatsApp : 0821-1857-0531<br>
                    Instagram : @rimprojects89_<br>
                    Email : rimprojects89@gmail.com
                </div>
            </td>
            <td style="width: 45%; vertical-align: bottom;">
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
