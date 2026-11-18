import * as React from 'react';
import { Head } from '@inertiajs/react';
import { Banknote, CheckCircle2, FileText, Printer } from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import { PageProps } from '@/types';
import { cn } from '@/lib/utils';

interface PersonalSlipItem {
    id: number;
    period_name: string;
    type?: 'regular' | 'thr';
    start_date_formatted: string;
    end_date_formatted: string;
    status: 'finalized' | 'paid';
    paid_at?: string | null;
    base_salary: number;
    fixed_allowance: number;
    overtime_hours: number;
    overtime_amount: number;
    bonus_amount: number;
    thr_amount: number;
    shortage_deduction: number;
    alpha_deduction: number;
    other_deduction: number;
    total_allowance: number;
    total_deduction: number;
    net_salary: number;
    present_days: number;
    absent_days: number;
    shortage_minutes: number;
    bank_name: string;
    bank_account_number: string;
    bank_account_holder: string;
}

interface Props extends PageProps {
    slips: PersonalSlipItem[];
}

function formatRp(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function MySlips({ auth, slips }: Props) {
    const initialRole = auth.user.role === 'admin' ? 'admin' : 'karyawan';

    return (
        <AppShell initialRole={initialRole} initialActive="slip">
            <Head title="Slip Gaji Saya" />

            <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                        Dokumen Penghasilan Resmi
                    </p>
                    <div className="flex items-center gap-2.5">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="size-5" />
                        </span>
                        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                            Slip Gaji Saya
                        </h1>
                    </div>
                </div>

                {slips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                            <Banknote className="size-7" />
                        </div>
                        <h2 className="mt-4 text-base font-semibold">
                            Belum Ada Slip Gaji Resmi
                        </h2>
                        <p className="mt-1 max-w-md text-xs text-muted-foreground">
                            Slip gaji bulanan akan muncul otomatis di sini setelah Admin / Finance
                            memfinalisasi periode payroll.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {slips.map((slip) => (
                            <article
                                key={slip.id}
                                className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs"
                            >
                                <div>
                                    <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-4">
                                        <div>
                                            <h2 className="text-base font-bold text-foreground">
                                                {slip.period_name}
                                            </h2>
                                            <p className="text-xs text-muted-foreground">
                                                Cut-off: {slip.start_date_formatted} –{' '}
                                                {slip.end_date_formatted}
                                            </p>
                                        </div>

                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                                                slip.status === 'paid'
                                                    ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200'
                                                    : 'bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200',
                                            )}
                                        >
                                            <CheckCircle2 className="size-3" />
                                            {slip.status === 'paid'
                                                ? 'Sudah Ditransfer'
                                                : 'Resmi (Finalized)'}
                                        </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                                        <div className="flex flex-col gap-1.5 rounded-xl bg-muted/30 p-3">
                                            <p className="font-semibold text-muted-foreground uppercase text-[10px]">
                                                Penerimaan
                                            </p>
                                            {slip.type === 'thr' ? (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span>THR Keagamaan</span>
                                                        <span className="font-mono font-medium">
                                                            {formatRp(slip.thr_amount)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Insentif Tambahan</span>
                                                        <span className="font-mono font-medium">
                                                            {formatRp(slip.bonus_amount)}
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span>Gaji Pokok</span>
                                                        <span className="font-mono font-medium">
                                                            {formatRp(slip.base_salary)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Tunjangan Tetap</span>
                                                        <span className="font-mono font-medium">
                                                            {formatRp(slip.fixed_allowance)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Lembur ({slip.overtime_hours}j)</span>
                                                        <span className="font-mono font-medium">
                                                            {formatRp(slip.overtime_amount)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Bonus &amp; Insentif</span>
                                                        <span className="font-mono font-medium">
                                                            {formatRp(slip.bonus_amount)}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1.5 rounded-xl bg-muted/30 p-3">
                                            <p className="font-semibold text-muted-foreground uppercase text-[10px]">
                                                Potongan & Kehadiran
                                            </p>
                                            <div className="flex justify-between">
                                                <span>Alpha ({slip.absent_days}h)</span>
                                                <span className="font-mono text-rose-700">
                                                    -{formatRp(slip.alpha_deduction)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Potongan Lain</span>
                                                <span className="font-mono text-rose-700">
                                                    -{formatRp(slip.other_deduction)}
                                                </span>
                                            </div>
                                            <div className="mt-auto flex justify-between border-t pt-1.5 text-[11px] text-muted-foreground">
                                                <span>Total Hadir</span>
                                                <span className="font-semibold text-foreground">
                                                    {slip.present_days} hari
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                                    <div>
                                        <p className="text-[11px] text-muted-foreground">
                                            Take-Home Pay · {slip.bank_name} ({slip.bank_account_number})
                                        </p>
                                        <p className="font-mono text-xl font-bold text-primary tabular-nums">
                                            {formatRp(slip.net_salary)}
                                        </p>
                                    </div>

                                    <a
                                        href={route('payroll.slip', slip.id)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-4 text-xs font-semibold text-background shadow-xs hover:bg-foreground/90"
                                    >
                                        <Printer className="size-3.5" />
                                        <span>Cetak / Simpan PDF</span>
                                    </a>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
