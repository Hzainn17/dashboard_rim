<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Slip Gaji — {{ $employeeUser->name ?? 'Karyawan' }} ({{ $payroll->period_name }})</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #f1f5f9;
            color: #1e293b;
            margin: 0;
            padding: 24px 16px;
            line-height: 1.5;
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
            padding: 9px 16px;
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
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 36px 40px;
            box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #46797b;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .brand h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #0f172a;
        }
        .brand p {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #64748b;
        }
        .doc-title {
            text-align: right;
        }
        .doc-title h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
            color: #46797b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .doc-title p {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #475569;
        }
        .badge {
            display: inline-block;
            margin-top: 6px;
            padding: 2px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            background: #e1f2f2;
            color: #225052;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px 20px;
            font-size: 13px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
        }
        .info-row:last-child {
            margin-bottom: 0;
        }
        .info-label {
            color: #64748b;
        }
        .info-value {
            font-weight: 600;
            color: #0f172a;
            text-align: right;
        }
        .columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 24px;
        }
        .box {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
        }
        .box-header {
            background: #f8fafc;
            padding: 10px 16px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #334155;
            border-bottom: 1px solid #e2e8f0;
        }
        .box-body {
            padding: 12px 16px;
            font-size: 13px;
        }
        .line-item {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px dashed #e2e8f0;
        }
        .line-item:last-child {
            border-bottom: none;
        }
        .line-total {
            display: flex;
            justify-content: space-between;
            padding: 10px 16px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            font-size: 13px;
            font-weight: 700;
        }
        .net-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #46797b;
            color: #ffffff;
            border-radius: 10px;
            padding: 18px 24px;
            margin-bottom: 28px;
        }
        .net-box .label {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            opacity: 0.9;
        }
        .net-box .sub {
            font-size: 12px;
            opacity: 0.85;
            margin-top: 2px;
        }
        .net-box .amount {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.02em;
        }
        .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 32px;
            font-size: 12px;
            color: #475569;
        }
        .sig-block {
            text-align: center;
        }
        .sig-line {
            margin-top: 56px;
            border-top: 1px solid #94a3b8;
            padding-top: 6px;
            font-weight: 600;
            color: #0f172a;
        }
        .mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
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
                border: none;
                box-shadow: none;
                padding: 0;
                max-width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <a href="javascript:history.back()" class="btn">← Kembali</a>
        <button type="button" onclick="window.print()" class="btn btn-primary">
            Cetak / Simpan sebagai PDF
        </button>
    </div>

    <div class="sheet">
        <div class="header">
            <div class="brand" style="display: flex; align-items: center; gap: 14px;">
                <img
                    src="{{ $office->company_logo_url ?: '/rim-projects-logo.png' }}"
                    alt="{{ $office->office_name ?? 'RIM Studio Arsitektur' }}"
                    style="height: 44px; width: auto; max-width: 110px; object-fit: contain;"
                >
                <div>
                    <h1>{{ $office->office_name ?? 'RIM Studio Arsitektur' }}</h1>
                    <p>Dokumen Slip Gaji Resmi · Rahasia Perusahaan</p>
                </div>
            </div>
            <div class="doc-title">
                <h2>{{ $payroll->isThr() ? 'Slip THR Keagamaan' : 'Slip Gaji' }}</h2>
                <p>{{ $payroll->period_name }}</p>
                <span class="badge">
                    {{ $payroll->status === 'paid' ? 'Sudah Dibayar (Paid)' : ($payroll->status === 'finalized' ? 'Resmi (Finalized)' : 'Draft') }}
                </span>
            </div>
        </div>

        <div class="info-grid">
            <div>
                <div class="info-row">
                    <span class="info-label">Nama Karyawan</span>
                    <span class="info-value">{{ $employeeUser->name ?? '-' }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Kode & Jabatan</span>
                    <span class="info-value">{{ $employee->employee_code ?? '-' }} · {{ $employee->position ?? 'Arsitek' }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Periode Cut-off</span>
                    <span class="info-value">{{ $payroll->start_date->translatedFormat('d M Y') }} – {{ $payroll->end_date->translatedFormat('d M Y') }}</span>
                </div>
            </div>
            <div>
                <div class="info-row">
                    <span class="info-label">Rekening Transfer</span>
                    <span class="info-value">{{ $item->bank_name ?: 'BCA' }} · <span class="mono">{{ $item->bank_account_number ?: '-' }}</span></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Atas Nama</span>
                    <span class="info-value">{{ $item->bank_account_holder ?: ($employeeUser->name ?? '-') }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">{{ $payroll->isThr() ? 'Tanggal Hari Raya' : 'Kehadiran / Alpha' }}</span>
                    <span class="info-value">
                        @if($payroll->isThr())
                            {{ $payroll->thr_reference_date?->translatedFormat('d M Y') ?? $payroll->end_date->translatedFormat('d M Y') }}
                        @else
                            {{ $item->present_days }} hari hadir · {{ $item->absent_days }} alpha
                        @endif
                    </span>
                </div>
            </div>
        </div>

        <div class="columns">
            <div class="box">
                <div class="box-header">Penerimaan (Earnings)</div>
                <div class="box-body">
                    @if($payroll->isThr())
                        <div class="line-item">
                            <span>Tunjangan Hari Raya (Permenaker No. 6/2016)</span>
                            <span class="mono">Rp {{ number_format((float) $item->thr_amount, 0, ',', '.') }}</span>
                        </div>
                        <div class="line-item">
                            <span>Insentif / Bonus Tambahan</span>
                            <span class="mono">Rp {{ number_format((float) $item->bonus_amount, 0, ',', '.') }}</span>
                        </div>
                    @else
                        <div class="line-item">
                            <span>Gaji Pokok</span>
                            <span class="mono">Rp {{ number_format((float) $item->base_salary, 0, ',', '.') }}</span>
                        </div>
                        <div class="line-item">
                            <span>Tunjangan Tetap</span>
                            <span class="mono">Rp {{ number_format((float) $item->fixed_allowance, 0, ',', '.') }}</span>
                        </div>
                        <div class="line-item">
                            <span>Lembur ({{ number_format((float) $item->overtime_hours, 1) }} jam)</span>
                            <span class="mono">Rp {{ number_format((float) $item->overtime_amount, 0, ',', '.') }}</span>
                        </div>
                        <div class="line-item">
                            <span>Bonus &amp; Insentif</span>
                            <span class="mono">Rp {{ number_format((float) $item->bonus_amount, 0, ',', '.') }}</span>
                        </div>
                    @endif
                </div>
                <div class="line-total">
                    <span>Total Penerimaan</span>
                    <span class="mono">Rp {{ number_format((float) $item->base_salary + (float) $item->total_allowance, 0, ',', '.') }}</span>
                </div>
            </div>

            <div class="box">
                <div class="box-header">Potongan (Deductions)</div>
                <div class="box-body">
                    <div class="line-item">
                        <span>Potongan Alpha ({{ $item->absent_days }} hari)</span>
                        <span class="mono">Rp {{ number_format((float) $item->alpha_deduction, 0, ',', '.') }}</span>
                    </div>
                    <div class="line-item">
                        <span>Potongan Lainnya / Kasbon</span>
                        <span class="mono">Rp {{ number_format((float) $item->other_deduction, 0, ',', '.') }}</span>
                    </div>
                </div>
                <div class="line-total">
                    <span>Total Potongan</span>
                    <span class="mono">Rp {{ number_format((float) $item->total_deduction, 0, ',', '.') }}</span>
                </div>
            </div>
        </div>

        <div class="net-box">
            <div>
                <div class="label">Total Diterima (Take-Home Pay)</div>
                <div class="sub">Ditransfer ke {{ $item->bank_name ?: 'BCA' }} {{ $item->bank_account_number ?: '-' }}</div>
            </div>
            <div class="amount mono">
                Rp {{ number_format((float) $item->net_salary, 0, ',', '.') }}
            </div>
        </div>

        <div class="signatures">
            <div class="sig-block">
                <p>Penerima,</p>
                <div class="sig-line">{{ $employeeUser->name ?? 'Karyawan' }}</div>
            </div>
            <div class="sig-block">
                <p>Disetujui oleh Finance / Principal,</p>
                <div class="sig-line">{{ $office->office_name ?? 'RIM Studio Arsitektur' }}</div>
            </div>
        </div>
    </div>
</body>
</html>
