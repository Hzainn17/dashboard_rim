import * as React from 'react';
import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Banknote,
    CheckCircle2,
    Download,
    Edit3,
    FileText,
    Lock,
    Plus,
    Printer,
    RefreshCw,
    Trash2,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import { MemberAvatar } from '@/Components/dashboard/member-avatar';
import { CurrencyInput } from '@/Components/CurrencyInput';
import { PageProps } from '@/types';
import { cn } from '@/lib/utils';

interface PayrollPeriodSummary {
    id: number;
    period_name: string;
    type: 'regular' | 'thr';
    start_date: string;
    end_date: string;
    thr_reference_date?: string | null;
    period_month: number;
    period_year: number;
    status: 'draft' | 'finalized' | 'paid';
    total_amount: number;
    finalized_at?: string | null;
    paid_at?: string | null;
    generator_name: string;
}

interface SelectedPayrollDetail {
    id: number;
    period_name: string;
    type: 'regular' | 'thr';
    start_date: string;
    end_date: string;
    thr_reference_date?: string | null;
    thr_reference_date_formatted?: string | null;
    start_date_formatted: string;
    end_date_formatted: string;
    period_month: number;
    period_year: number;
    status: 'draft' | 'finalized' | 'paid';
    total_amount: number;
    items_count: number;
    total_overtime_amount: number;
    total_bonus_thr: number;
    total_deduction: number;
}

interface PayrollItemRow {
    id: number;
    user_id: number;
    employee_name: string;
    employee_code: string;
    position: string;
    photo_url?: string | null;
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
    is_manual_override: boolean;
    bank_name: string;
    bank_account_number: string;
    bank_account_holder: string;
}

interface ActiveEmployeeOption {
    id: number;
    name: string;
    employee_code: string;
    position: string;
    join_date?: string | null;
    base_salary: number;
    fixed_allowance: number;
    bank_name: string;
}

function estimateKemnakerThr(emp: ActiveEmployeeOption, refDateStr: string): { months: number; amount: number } {
    const monthlyWage = (emp.base_salary || 0) + (emp.fixed_allowance || 0);
    if (!emp.join_date || !refDateStr) {
        return { months: 12, amount: monthlyWage };
    }
    const join = new Date(emp.join_date);
    const ref = new Date(refDateStr);
    if (Number.isNaN(join.getTime()) || Number.isNaN(ref.getTime()) || join > ref) {
        return { months: 0, amount: 0 };
    }
    let months = (ref.getFullYear() - join.getFullYear()) * 12 + (ref.getMonth() - join.getMonth());
    if (ref.getDate() < join.getDate()) {
        months -= 1;
    }
    months = Math.max(0, months);
    if (months >= 12) {
        return { months, amount: monthlyWage };
    }
    if (months >= 1) {
        return { months, amount: Math.round((months / 12) * monthlyWage) };
    }
    return { months: 0, amount: 0 };
}

interface Props extends PageProps {
    payrolls: PayrollPeriodSummary[];
    selectedPayroll: SelectedPayrollDetail | null;
    items: PayrollItemRow[];
    employees: ActiveEmployeeOption[];
    defaults: {
        period_name: string;
        period_month: number;
        period_year: number;
        start_date: string;
        end_date: string;
    };
}

function formatRp(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(amount);
}

const statusConfig: Record<
    'draft' | 'finalized' | 'paid',
    { label: string; className: string }
> = {
    draft: {
        label: 'Draft (Bisa Diedit)',
        className: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
    },
    finalized: {
        label: 'Finalized (Resmi)',
        className: 'bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200',
    },
    paid: {
        label: 'Sudah Dibayar (Paid)',
        className: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200',
    },
};

export default function PayrollIndex({
    auth,
    payrolls,
    selectedPayroll,
    items,
    employees,
    defaults,
}: Props) {
    const { flash } = usePage<PageProps>().props;
    const initialRole = auth.user.role === 'admin' ? 'admin' : 'karyawan';

    const [generateModalOpen, setGenerateModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PayrollItemRow | null>(null);

    const generateForm = useForm({
        period_name: defaults.period_name,
        type: 'regular' as 'regular' | 'thr',
        period_month: defaults.period_month,
        period_year: defaults.period_year,
        start_date: defaults.start_date,
        end_date: defaults.end_date,
        thr_reference_date: defaults.end_date,
        employee_ids: employees.map((e) => e.id),
    });

    const openGenerateModal = (type: 'regular' | 'thr') => {
        generateForm.setData({
            period_name:
                type === 'thr'
                    ? `THR Keagamaan ${defaults.period_year}`
                    : defaults.period_name,
            type,
            period_month: defaults.period_month,
            period_year: defaults.period_year,
            start_date: defaults.start_date,
            end_date: defaults.end_date,
            thr_reference_date: defaults.end_date,
            employee_ids: employees.map((e) => e.id),
        });
        setGenerateModalOpen(true);
    };

    const editForm = useForm({
        base_salary: 0,
        fixed_allowance: 0,
        overtime_amount: 0,
        bonus_amount: 0,
        thr_amount: 0,
        alpha_deduction: 0,
        other_deduction: 0,
    });

    const toggleGenerateEmployee = (empId: number) => {
        const current = generateForm.data.employee_ids;
        if (current.includes(empId)) {
            generateForm.setData(
                'employee_ids',
                current.filter((id) => id !== empId),
            );
        } else {
            generateForm.setData('employee_ids', [...current, empId]);
        }
    };

    const toggleAllGenerateEmployees = () => {
        if (generateForm.data.employee_ids.length === employees.length) {
            generateForm.setData('employee_ids', []);
        } else {
            generateForm.setData(
                'employee_ids',
                employees.map((e) => e.id),
            );
        }
    };

    const handleSelectPeriod = (payrollId: number) => {
        router.get(
            route('payroll.index'),
            { payroll_id: payrollId },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleGenerateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        generateForm.post(route('payroll.generate'), {
            onSuccess: () => setGenerateModalOpen(false),
        });
    };

    const openEditModal = (item: PayrollItemRow) => {
        setEditingItem(item);
        editForm.setData({
            base_salary: item.base_salary,
            fixed_allowance: item.fixed_allowance,
            overtime_amount: item.overtime_amount,
            bonus_amount: item.bonus_amount,
            thr_amount: item.thr_amount,
            alpha_deduction: item.alpha_deduction,
            other_deduction: item.other_deduction,
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
        editForm.put(route('payroll.items.update', editingItem.id), {
            preserveScroll: true,
            onSuccess: () => setEditingItem(null),
        });
    };

    const handleFinalize = () => {
        if (!selectedPayroll) return;
        if (
            !confirm(
                `Finalisasi ${selectedPayroll.period_name}? Setelah difinalisasi, slip gaji resmi akan muncul di akun karyawan dan tidak bisa diubah lagi.`,
            )
        ) {
            return;
        }
        router.patch(route('payroll.finalize', selectedPayroll.id), {}, { preserveScroll: true });
    };

    const handleMarkPaid = () => {
        if (!selectedPayroll) return;
        if (!confirm(`Tandai ${selectedPayroll.period_name} sebagai Sudah Dibayar (Paid)?`)) {
            return;
        }
        router.patch(route('payroll.mark-paid', selectedPayroll.id), {}, { preserveScroll: true });
    };

    const handleDeleteDraft = () => {
        if (!selectedPayroll) return;
        if (!confirm(`Hapus draft ${selectedPayroll.period_name}?`)) {
            return;
        }
        router.delete(route('payroll.destroy', selectedPayroll.id));
    };

    return (
        <AppShell initialRole={initialRole} initialActive="payroll">
            <Head title="Payroll Gaji" />

            <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-col gap-1">
                        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                            Penggajian Bulanan & Slip Gaji Otomatis
                        </p>
                        <div className="flex items-center gap-2.5">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Banknote className="size-5" />
                            </span>
                            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                                Payroll Gaji Tim
                            </h1>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => openGenerateModal('thr')}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium text-foreground shadow-xs transition hover:bg-muted"
                        >
                            <Plus className="size-4 text-primary" />
                            <span>Generate THR (Kemnaker)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => openGenerateModal('regular')}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition hover:bg-primary/90"
                        >
                            <Plus className="size-4" />
                            <span>Generate Gaji Bulanan</span>
                        </button>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {!selectedPayroll ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                            <Wallet className="size-7" />
                        </div>
                        <h2 className="mt-4 text-base font-semibold">
                            Belum Ada Periode Payroll
                        </h2>
                        <p className="mt-1 max-w-md text-xs text-muted-foreground">
                            Klik tombol <strong>Generate Payroll Periode</strong> untuk menghitung
                            gaji pokok, tunjangan, lembur yang disetujui, dan potongan absensi
                            seluruh tim secara otomatis.
                        </p>
                        <button
                            type="button"
                            onClick={() => openGenerateModal('regular')}
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                            <Plus className="size-4" />
                            <span>Buat Payroll Pertama</span>
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Period Switcher & Action Bar */}
                        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap items-center gap-3">
                                <select
                                    value={selectedPayroll.id}
                                    onChange={(e) => handleSelectPeriod(Number(e.target.value))}
                                    className="h-9 rounded-lg border bg-background px-3 text-xs font-semibold focus:border-foreground focus:outline-none"
                                >
                                    {payrolls.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.period_name} ({p.status.toUpperCase()})
                                        </option>
                                    ))}
                                </select>

                                <span
                                    className={cn(
                                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                                        statusConfig[selectedPayroll.status].className,
                                    )}
                                >
                                    {statusConfig[selectedPayroll.status].label}
                                </span>

                                <span className="text-xs text-muted-foreground">
                                    Cut-off: {selectedPayroll.start_date_formatted} –{' '}
                                    {selectedPayroll.end_date_formatted}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <a
                                    href={route('payroll.export-bank', selectedPayroll.id)}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted"
                                >
                                    <Download className="size-3.5" />
                                    <span>Export CSV Transfer BCA/BNI</span>
                                </a>

                                {selectedPayroll.status === 'draft' && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                router.post(
                                                    route('payroll.generate'),
                                                    {
                                                        period_name: selectedPayroll.period_name,
                                                        type: selectedPayroll.type,
                                                        period_month: selectedPayroll.period_month,
                                                        period_year: selectedPayroll.period_year,
                                                        start_date: selectedPayroll.start_date,
                                                        end_date: selectedPayroll.end_date,
                                                        thr_reference_date: selectedPayroll.thr_reference_date,
                                                        employee_ids: items.map((i) => i.user_id),
                                                    },
                                                    { preserveScroll: true },
                                                );
                                            }}
                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted"
                                        >
                                            <RefreshCw className="size-3.5" />
                                            <span>Hitung Ulang Absensi</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleFinalize}
                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3.5 text-xs font-semibold text-background hover:bg-foreground/90"
                                        >
                                            <Lock className="size-3.5" />
                                            <span>Finalisasi Payroll</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleDeleteDraft}
                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                        >
                                            <Trash2 className="size-3.5" />
                                            <span>Hapus Draft</span>
                                        </button>
                                    </>
                                )}

                                {selectedPayroll.status === 'finalized' && (
                                    <button
                                        type="button"
                                        onClick={handleMarkPaid}
                                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success px-3.5 text-xs font-semibold text-white hover:bg-success/90"
                                    >
                                        <CheckCircle2 className="size-3.5" />
                                        <span>Tandai Sudah Dibayar (Paid)</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 4 Summary Metrics */}
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <div className="rounded-xl border bg-card p-4">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Total Net Payroll
                                </p>
                                <p className="mt-2 font-mono text-xl font-bold tracking-tight tabular-nums md:text-2xl">
                                    {formatRp(selectedPayroll.total_amount)}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    {selectedPayroll.items_count} penerima gaji aktif
                                </p>
                            </div>

                            <div className="rounded-xl border bg-card p-4">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Total Lembur Disetujui
                                </p>
                                <p className="mt-2 font-mono text-xl font-bold tracking-tight text-primary tabular-nums md:text-2xl">
                                    {formatRp(selectedPayroll.total_overtime_amount)}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    Otomatis dari modul Lembur
                                </p>
                            </div>

                            <div className="rounded-xl border bg-card p-4">
                                <p className="text-xs font-medium text-muted-foreground">
                                    {selectedPayroll.type === 'thr'
                                        ? 'Total THR & Insentif'
                                        : 'Total Insentif / Bonus'}
                                </p>
                                <p className="mt-2 font-mono text-xl font-bold tracking-tight text-emerald-700 tabular-nums md:text-2xl">
                                    {formatRp(selectedPayroll.total_bonus_thr)}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    {selectedPayroll.type === 'thr'
                                        ? 'Sesuai Permenaker No. 6 Tahun 2016'
                                        : 'Insentif proyek & bonus kinerja'}
                                </p>
                            </div>

                            <div className="rounded-xl border bg-card p-4">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Total Potongan
                                </p>
                                <p className="mt-2 font-mono text-xl font-bold tracking-tight text-rose-700 tabular-nums md:text-2xl">
                                    {formatRp(selectedPayroll.total_deduction)}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    Alpha &amp; kasbon / potongan lainnya
                                </p>
                            </div>
                        </div>

                        {/* Employee Payroll Table */}
                        <div className="overflow-hidden rounded-xl border bg-card">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b bg-muted/40 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-4 py-3">Karyawan</th>
                                            <th className="px-4 py-3">Rekening Bank</th>
                                            <th className="px-4 py-3">Kehadiran</th>
                                            <th className="px-4 py-3 text-right">Gaji Pokok</th>
                                            <th className="px-4 py-3 text-right">
                                                Tunjangan & Lembur
                                            </th>
                                            <th className="px-4 py-3 text-right">
                                                {selectedPayroll.type === 'thr'
                                                    ? 'THR & Insentif'
                                                    : 'Insentif / Bonus'}
                                            </th>
                                            <th className="px-4 py-3 text-right">Potongan</th>
                                            <th className="px-4 py-3 text-right">Take-Home Pay</th>
                                            <th className="px-4 py-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {items.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="transition-colors hover:bg-muted/30"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <MemberAvatar
                                                            id={item.user_id}
                                                            name={item.employee_name}
                                                            photoUrl={item.photo_url}
                                                            className="size-8 ring-0"
                                                        />
                                                        <div>
                                                            <p className="font-semibold text-foreground">
                                                                {item.employee_name}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {item.employee_code} · {item.position}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-foreground">
                                                        {item.bank_name}
                                                    </p>
                                                    <p className="font-mono text-[11px] text-muted-foreground">
                                                        {item.bank_account_number}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-foreground">
                                                        {item.present_days} hr hadir
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {item.absent_days} alpha ·{' '}
                                                        {item.shortage_minutes} mnt kurang
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono tabular-nums">
                                                    {formatRp(item.base_salary)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <p className="font-mono tabular-nums">
                                                        {formatRp(
                                                            item.fixed_allowance +
                                                                item.overtime_amount,
                                                        )}
                                                    </p>
                                                    {item.overtime_hours > 0 && (
                                                        <p className="text-[10px] text-primary">
                                                            +{item.overtime_hours} jam lembur
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-emerald-700 tabular-nums">
                                                    {formatRp(item.bonus_amount + item.thr_amount)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-rose-700 tabular-nums">
                                                    -{formatRp(item.total_deduction)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-sm font-bold text-foreground tabular-nums">
                                                    {formatRp(item.net_salary)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        {selectedPayroll.status === 'draft' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditModal(item)}
                                                                className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
                                                            >
                                                                <Edit3 className="size-3" />
                                                                <span>Edit</span>
                                                            </button>
                                                        )}
                                                        <a
                                                            href={route('payroll.slip', item.id)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background hover:bg-foreground/90"
                                                        >
                                                            <Printer className="size-3" />
                                                            <span>Slip PDF</span>
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modal Generate Payroll */}
            {generateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="flex items-start justify-between border-b pb-3">
                            <div>
                                <h3 className="text-base font-bold">
                                    {generateForm.data.type === 'thr'
                                        ? 'Generate THR Keagamaan (Kemnaker)'
                                        : 'Generate Gaji Bulanan'}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {generateForm.data.type === 'thr'
                                        ? 'Dihitung otomatis sesuai Permenaker No. 6 Tahun 2016 (≥12 bln = 1x upah, <12 bln = prorata).'
                                        : 'Hitung gaji pokok, tunjangan, insentif, lembur & potongan absensi.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setGenerateModalOpen(false)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleGenerateSubmit} className="mt-4 flex flex-col gap-3.5">
                            <div>
                                <label className="text-xs font-semibold">Nama Periode</label>
                                <input
                                    type="text"
                                    required
                                    value={generateForm.data.period_name}
                                    onChange={(e) =>
                                        generateForm.setData('period_name', e.target.value)
                                    }
                                    className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold">Bulan (1-12)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={12}
                                        required
                                        value={generateForm.data.period_month}
                                        onChange={(e) =>
                                            generateForm.setData(
                                                'period_month',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold">Tahun</label>
                                    <input
                                        type="number"
                                        min={2020}
                                        max={2100}
                                        required
                                        value={generateForm.data.period_year}
                                        onChange={(e) =>
                                            generateForm.setData(
                                                'period_year',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs"
                                    />
                                </div>
                            </div>

                            {generateForm.data.type !== 'thr' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold">Cut-off Mulai</label>
                                        <input
                                            type="date"
                                            required
                                            value={generateForm.data.start_date}
                                            onChange={(e) =>
                                                generateForm.setData('start_date', e.target.value)
                                            }
                                            className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold">Cut-off Akhir</label>
                                        <input
                                            type="date"
                                            required
                                            value={generateForm.data.end_date}
                                            onChange={(e) =>
                                                generateForm.setData('end_date', e.target.value)
                                            }
                                            className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs"
                                        />
                                    </div>
                                </div>
                            )}

                            {generateForm.data.type === 'thr' && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                                    <label className="text-xs font-semibold text-amber-950">
                                        Tanggal Hari Raya / Acuan Masa Kerja *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={generateForm.data.thr_reference_date}
                                        onChange={(e) =>
                                            generateForm.setData(
                                                'thr_reference_date',
                                                e.target.value,
                                            )
                                        }
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs"
                                    />
                                    <p className="mt-1 text-[11px] text-amber-800">
                                        Masa kerja dihitung dari Tanggal Masuk karyawan hingga
                                        tanggal Hari Raya di atas.
                                    </p>
                                </div>
                            )}

                            {/* Pilihan Karyawan yang Digaji pada Periode Ini */}
                            <div className="rounded-xl border bg-muted/20 p-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-foreground">
                                        Pilih Karyawan ({generateForm.data.employee_ids.length}/{employees.length})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={toggleAllGenerateEmployees}
                                        className="text-[11px] font-semibold text-primary hover:underline"
                                    >
                                        {generateForm.data.employee_ids.length === employees.length
                                            ? 'Hapus Semua'
                                            : 'Pilih Semua'}
                                    </button>
                                </div>
                                <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border bg-background p-2">
                                    {employees.map((emp) => {
                                        const checked = generateForm.data.employee_ids.includes(emp.id);
                                        return (
                                            <label
                                                key={emp.id}
                                                className={cn(
                                                    'flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition',
                                                    checked ? 'bg-primary/10 text-foreground' : 'hover:bg-muted',
                                                )}
                                            >
                                                <span className="flex items-center gap-2 truncate">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleGenerateEmployee(emp.id)}
                                                        className="size-3.5 rounded border-muted-foreground/30 text-primary focus:ring-primary"
                                                    />
                                                    <span className="truncate font-medium">{emp.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        ({emp.position})
                                                    </span>
                                                </span>
                                                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                                                    {generateForm.data.type === 'thr'
                                                        ? (() => {
                                                              const est = estimateKemnakerThr(
                                                                  emp,
                                                                  generateForm.data.thr_reference_date,
                                                              );
                                                              return `${est.months} bln · ${formatRp(est.amount)}`;
                                                          })()
                                                        : formatRp(emp.base_salary)}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {generateForm.data.employee_ids.length === 0 && (
                                    <p className="mt-1 text-[11px] text-destructive">
                                        Pilih minimal 1 karyawan untuk di-generate.
                                    </p>
                                )}
                            </div>

                            <div className="mt-2 flex justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setGenerateModalOpen(false)}
                                    className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        generateForm.processing ||
                                        generateForm.data.employee_ids.length === 0
                                    }
                                    className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {generateForm.processing
                                        ? 'Menghitung...'
                                        : 'Generate Draft Payroll'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Edit Komponen Gaji */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="flex items-start justify-between border-b pb-3">
                            <div>
                                <h3 className="text-base font-bold">
                                    Sesuaikan Komponen Gaji
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {editingItem.employee_name} ({editingItem.employee_code})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingItem(null)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="mt-4 flex max-h-[75vh] flex-col gap-3 overflow-y-auto pr-1">
                            <div className="rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2 text-[11px] text-sky-900">
                                Perubahan di sini <strong>hanya berlaku untuk periode payroll ini</strong> dan tidak mengubah data master Gaji Pokok / Tunjangan karyawan.
                            </div>

                            {selectedPayroll?.type === 'thr' ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold">
                                            Nominal THR (Permenaker)
                                        </label>
                                        <CurrencyInput
                                            value={editForm.data.thr_amount}
                                            onChange={(val) => editForm.setData('thr_amount', val)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold">
                                            Insentif Tambahan
                                        </label>
                                        <CurrencyInput
                                            value={editForm.data.bonus_amount}
                                            onChange={(val) => editForm.setData('bonus_amount', val)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold">
                                                Gaji Pokok
                                            </label>
                                            <CurrencyInput
                                                value={editForm.data.base_salary}
                                                onChange={(val) =>
                                                    editForm.setData('base_salary', val)
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold">
                                                Tunjangan Tetap
                                            </label>
                                            <CurrencyInput
                                                value={editForm.data.fixed_allowance}
                                                onChange={(val) =>
                                                    editForm.setData('fixed_allowance', val)
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold">
                                                Lembur ({editingItem.overtime_hours}j)
                                            </label>
                                            <CurrencyInput
                                                value={editForm.data.overtime_amount}
                                                onChange={(val) =>
                                                    editForm.setData('overtime_amount', val)
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold">
                                            Bonus &amp; Insentif
                                        </label>
                                        <CurrencyInput
                                            value={editForm.data.bonus_amount}
                                            onChange={(val) => editForm.setData('bonus_amount', val)}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold">
                                        Potongan Alpha
                                    </label>
                                    <CurrencyInput
                                        value={editForm.data.alpha_deduction}
                                        onChange={(val) => editForm.setData('alpha_deduction', val)}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold">
                                        Potongan Lainnya / Kasbon
                                    </label>
                                    <CurrencyInput
                                        value={editForm.data.other_deduction}
                                        onChange={(val) => editForm.setData('other_deduction', val)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                                <span className="font-medium text-muted-foreground">
                                    Estimasi Take-Home Pay Periode Ini
                                </span>
                                <span className="font-mono text-sm font-bold text-primary">
                                    {formatRp(
                                        Math.max(
                                            0,
                                            editForm.data.base_salary +
                                                editForm.data.fixed_allowance +
                                                editForm.data.overtime_amount +
                                                editForm.data.bonus_amount +
                                                editForm.data.thr_amount -
                                                (editForm.data.alpha_deduction +
                                                    editForm.data.other_deduction),
                                        ),
                                    )}
                                </span>
                            </div>

                            <div className="mt-1 flex justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background hover:bg-foreground/90 disabled:opacity-50"
                                >
                                    {editForm.processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
