import * as React from 'react';
import { useMemo, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    Briefcase,
    Building2,
    CheckCircle2,
    CreditCard,
    GraduationCap,
    KeyRound,
    Mail,
    Pencil,
    Phone,
    Plus,
    Power,
    Search,
    ShieldCheck,
    Trash2,
    UserCheck,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { CurrencyInput } from '@/Components/CurrencyInput';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { MemberAvatar } from './member-avatar';

export type EmployeeRecord = {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    role: 'super_admin' | 'admin' | 'employee';
    is_active: boolean;
    photo_url?: string | null;
    employee_code: string;
    position: string;
    department?: string | null;
    work_type?: 'kantor' | 'lapangan' | null;
    join_date?: string | null;
    employment_status: 'tetap' | 'kontrak' | 'magang';
    annual_leave_quota: number;
    base_salary?: number;
    fixed_allowance?: number;
    overtime_rate_per_hour?: number;
    bank_name?: string | null;
    bank_account_number?: string | null;
    bank_account_holder?: string | null;
    bank_branch?: string | null;
};

export type EmployeeStats = {
    total: number;
    active: number;
    tetap: number;
    kontrak: number;
    magang: number;
};

const avatarTones = [
    'bg-stone-800 text-stone-50',
    'bg-orange-200 text-orange-900',
    'bg-emerald-200 text-emerald-900',
    'bg-amber-200 text-amber-900',
    'bg-stone-300 text-stone-800',
    'bg-rose-200 text-rose-900',
];

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

function formatRupiah(amount?: number) {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(amount);
}

const statusBadgeStyle: Record<EmployeeRecord['employment_status'], { label: string; className: string }> = {
    tetap: { label: 'Tetap', className: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200' },
    kontrak: { label: 'Kontrak', className: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200' },
    magang: { label: 'Magang', className: 'bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-300' },
};

const positionSuggestions = [
    'Principal Architect',
    'Lead Arsitek',
    'Senior Architect',
    'Junior Architect',
    'Drafter',
    '3D Visualizer',
    'Interior Designer',
    'Site Supervisor',
    'Admin & Finance',
];

const departmentOptions = ['Perencanaan', 'Pembangunan', 'Administrasi', 'Digital Marketing'];

export function EmployeeManagement({
    employees,
    stats,
    nextEmployeeCode,
}: {
    employees: EmployeeRecord[];
    stats: EmployeeStats;
    nextEmployeeCode: string;
}) {
    const { auth, flash } = usePage<PageProps>().props;
    const isAdmin = auth?.user?.role === 'super_admin';

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'Semua' | 'tetap' | 'kontrak' | 'magang'>('Semua');
    const [deptFilter, setDeptFilter] = useState<string>('Semua');

    const [modalOpen, setModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
    const [deletingEmployee, setDeletingEmployee] = useState<EmployeeRecord | null>(null);
    const [deletingInProgress, setDeletingInProgress] = useState(false);

    const filtered = useMemo(() => {
        return employees.filter((emp) => {
            const q = search.trim().toLowerCase();
            const matchesSearch =
                !q ||
                emp.name.toLowerCase().includes(q) ||
                emp.email.toLowerCase().includes(q) ||
                emp.employee_code.toLowerCase().includes(q) ||
                emp.position.toLowerCase().includes(q) ||
                (emp.department ?? '').toLowerCase().includes(q);

            const matchesStatus = statusFilter === 'Semua' || emp.employment_status === statusFilter;
            const matchesDept = deptFilter === 'Semua' || emp.department === deptFilter;

            return matchesSearch && matchesStatus && matchesDept;
        });
    }, [employees, search, statusFilter, deptFilter]);

    const openCreateModal = () => {
        setEditingEmployee(null);
        setModalOpen(true);
    };

    const openEditModal = (emp: EmployeeRecord) => {
        setEditingEmployee(emp);
        setModalOpen(true);
    };

    const handleToggleStatus = (emp: EmployeeRecord) => {
        router.patch(route('employees.toggle-status', emp.id), {}, { preserveScroll: true });
    };

    const handleConfirmDelete = () => {
        if (!deletingEmployee) {
            return;
        }
        setDeletingInProgress(true);
        router.delete(route('employees.destroy', deletingEmployee.id), {
            preserveScroll: true,
            onFinish: () => {
                setDeletingInProgress(false);
                setDeletingEmployee(null);
            },
        });
    };

    const metricCards = [
        {
            label: 'Karyawan Aktif',
            value: String(stats.active),
            suffix: `/${stats.total}`,
            hint: 'Akun aktif dapat mengakses dashboard',
            icon: Users,
            ratio: stats.total > 0 ? stats.active / stats.total : 1,
        },
        {
            label: 'Karyawan Tetap',
            value: String(stats.tetap),
            suffix: 'orang',
            hint: 'Staf tetap penuh waktu studio',
            icon: UserCheck,
            ratio: stats.total > 0 ? stats.tetap / stats.total : 0,
        },
        {
            label: 'Karyawan Kontrak',
            value: String(stats.kontrak),
            suffix: 'orang',
            hint: 'Kontrak berbasis periode proyek',
            icon: Briefcase,
            ratio: stats.total > 0 ? stats.kontrak / stats.total : 0,
        },
        {
            label: 'Staf Magang',
            value: String(stats.magang),
            suffix: 'orang',
            hint: 'Program internship arsitektur',
            icon: GraduationCap,
            ratio: stats.total > 0 ? stats.magang / stats.total : 0,
        },
    ];

    return (
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
            {/* Page Heading */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                        Manajemen Tim & Direktori Studio
                    </p>
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                        Data Karyawan{' '}
                        <span className="text-muted-foreground font-normal">
                            ({stats.total} personel)
                        </span>
                    </h1>
                </div>

                {isAdmin && (
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/30"
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Tambah Karyawan Baru
                    </button>
                )}
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
                    <X className="size-4 shrink-0" />
                    <span>{flash.error}</span>
                </div>
            )}

            {/* 4 Quick Metric Cards */}
            <section aria-label="Statistik karyawan" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {metricCards.map((m) => {
                    const Icon = m.icon;
                    return (
                        <div key={m.label} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                            </div>
                            <p className="flex items-baseline gap-1">
                                <span className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">
                                    {m.value}
                                </span>
                                {m.suffix && <span className="text-sm text-muted-foreground">{m.suffix}</span>}
                            </p>
                            <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                <div
                                    className="h-full rounded-full bg-foreground/80"
                                    style={{ width: `${Math.min(100, m.ratio * 100)}%` }}
                                />
                            </div>
                            <p className="text-[11px] leading-snug text-muted-foreground">{m.hint}</p>
                        </div>
                    );
                })}
            </section>

            {/* Directory Card */}
            <section aria-labelledby="directory-title" className="flex flex-col rounded-xl border bg-card">
                {/* Filter & Search Header */}
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="relative max-w-sm flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari nama, NIK (RIM-xxx), jabatan, email…"
                            className="h-9 w-full rounded-lg border bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Department Select */}
                        <select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            aria-label="Filter divisi"
                            className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium text-foreground outline-none focus-visible:border-ring"
                        >
                            <option value="Semua">Semua Divisi</option>
                            {departmentOptions.map((d) => (
                                <option key={d} value={d}>
                                    Divisi {d}
                                </option>
                            ))}
                        </select>

                        {/* Status Pills */}
                        <div role="tablist" aria-label="Filter status kerja" className="flex gap-1">
                            {(['Semua', 'tetap', 'kontrak', 'magang'] as const).map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    role="tab"
                                    aria-selected={statusFilter === st}
                                    onClick={() => setStatusFilter(st)}
                                    className={cn(
                                        'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors outline-none',
                                        statusFilter === st
                                            ? 'border-foreground bg-foreground text-background'
                                            : 'bg-card text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {st === 'Semua' ? 'Semua' : st}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Employee Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                <th className="px-5 py-3">Personel</th>
                                <th className="px-4 py-3">NIK & Posisi</th>
                                <th className="px-4 py-3">Status Kerja</th>
                                {isAdmin && <th className="px-4 py-3">Gaji & Lembur</th>}
                                {isAdmin && <th className="px-4 py-3">Rekening Bank</th>}
                                <th className="px-4 py-3">Status Akun</th>
                                {isAdmin && <th className="px-5 py-3 text-right">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={isAdmin ? 7 : 4}
                                        className="px-5 py-12 text-center text-sm text-muted-foreground"
                                    >
                                        Tidak ada data karyawan yang cocok dengan pencarian Anda.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((emp) => {
                                    const badge = statusBadgeStyle[emp.employment_status] ?? statusBadgeStyle.tetap;

                                    return (
                                        <tr
                                            key={emp.id}
                                            className={cn(
                                                'transition-colors hover:bg-muted/30',
                                                !emp.is_active && 'opacity-60',
                                            )}
                                        >
                                            {/* Personel */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <MemberAvatar
                                                        id={emp.id}
                                                        name={emp.name}
                                                        photoUrl={emp.photo_url}
                                                        className="size-9 shrink-0 text-xs ring-0"
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="truncate font-medium text-foreground">
                                                                {emp.name}
                                                            </p>
                                                            {emp.role === 'super_admin' && (
                                                                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-semibold text-primary">
                                                                    <ShieldCheck className="size-3" />
                                                                    Super Admin
                                                                </span>
                                                            )}
                                                            {emp.role === 'admin' && (
                                                                <span className="inline-flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-px text-[10px] font-medium text-accent-foreground">
                                                                    <ShieldCheck className="size-3" />
                                                                    Admin
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                            <span className="inline-flex items-center gap-1">
                                                                <Mail className="size-3" />
                                                                {emp.email}
                                                            </span>
                                                            {emp.phone && (
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Phone className="size-3" />
                                                                    {emp.phone}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* NIK & Posisi */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-mono text-xs font-semibold text-primary">
                                                        {emp.employee_code}
                                                    </span>
                                                    <span className="font-medium text-foreground">{emp.position}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Divisi {emp.department || 'Perencanaan'} ·{' '}
                                                        {emp.work_type === 'lapangan' ? 'Lapangan' : 'Kantor'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status Kerja */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', badge.className)}>
                                                        {badge.label}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Sejak {emp.join_date || '—'} · Cuti {emp.annual_leave_quota} hr
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Gaji & Lembur (Admin Only) */}
                                            {isAdmin && (
                                                <td className="px-4 py-3.5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-mono text-xs font-semibold tabular-nums">
                                                            {formatRupiah(emp.base_salary)}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            Tunjangan: {formatRupiah(emp.fixed_allowance)}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            Lembur: {formatRupiah(emp.overtime_rate_per_hour)}/jam
                                                        </span>
                                                    </div>
                                                </td>
                                            )}

                                            {/* Rekening Bank (Admin Only) */}
                                            {isAdmin && (
                                                <td className="px-4 py-3.5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className={cn(
                                                                    'rounded px-1.5 py-px font-mono text-[10px] font-semibold',
                                                                    emp.bank_name === 'BCA'
                                                                        ? 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200'
                                                                        : 'bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-200',
                                                                )}
                                                            >
                                                                {emp.bank_name || 'BCA'}
                                                            </span>
                                                            <span className="font-mono text-xs tabular-nums">
                                                                {emp.bank_account_number || '—'}
                                                            </span>
                                                        </div>
                                                        <span className="truncate text-[11px] text-muted-foreground">
                                                            a.n. {emp.bank_account_holder || emp.name}
                                                        </span>
                                                    </div>
                                                </td>
                                            )}

                                            {/* Status Akun */}
                                            <td className="px-4 py-3.5">
                                                {emp.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-medium text-success">
                                                        <span className="size-1.5 rounded-full bg-success" />
                                                        Aktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                        <span className="size-1.5 rounded-full bg-muted-foreground" />
                                                        Nonaktif
                                                    </span>
                                                )}
                                            </td>

                                            {/* Aksi Admin */}
                                            {isAdmin && (
                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="inline-flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(emp)}
                                                            title="Edit data karyawan"
                                                            className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                                        >
                                                            <Pencil className="size-3.5" />
                                                            Edit
                                                        </button>
                                                        {emp.id !== auth.user.id && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleStatus(emp)}
                                                                    title={emp.is_active ? 'Nonaktifkan akun' : 'Aktifkan akun'}
                                                                    className={cn(
                                                                        'inline-flex size-8 items-center justify-center rounded-md border transition-colors',
                                                                        emp.is_active
                                                                            ? 'text-muted-foreground hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700'
                                                                            : 'text-success hover:bg-success/10',
                                                                    )}
                                                                >
                                                                    <Power className="size-3.5" />
                                                                    <span className="sr-only">
                                                                        {emp.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                                    </span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDeletingEmployee(emp)}
                                                                    title="Hapus permanen karyawan"
                                                                    className="inline-flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                    <span className="sr-only">Hapus Permanen</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Create / Edit Modal */}
            {isAdmin && modalOpen && (
                <EmployeeFormModal
                    employee={editingEmployee}
                    nextEmployeeCode={nextEmployeeCode}
                    onClose={() => setModalOpen(false)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {isAdmin && deletingEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
                        <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                                <Trash2 className="size-5" />
                            </span>
                            <div>
                                <h3 className="text-base font-semibold text-foreground">
                                    Hapus Karyawan Permanen?
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                    Anda akan menghapus <strong>{deletingEmployee.name}</strong> ({deletingEmployee.employee_code}) beserta riwayat absensi &amp; slip gajinya secara permanen.
                                </p>
                                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                                    <strong>Tips:</strong> Jika karyawan resign namun arsip slip gaji &amp; absensinya masih ingin disimpan, gunakan tombol <strong>Nonaktifkan (ikon Power)</strong> saja.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={deletingInProgress}
                                onClick={() => setDeletingEmployee(null)}
                                className="inline-flex h-9 items-center rounded-lg border bg-background px-3.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={deletingInProgress}
                                onClick={handleConfirmDelete}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-destructive px-4 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                            >
                                <Trash2 className="size-3.5" />
                                {deletingInProgress ? 'Menghapus...' : 'Ya, Hapus Permanen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EmployeeFormModal({
    employee,
    nextEmployeeCode,
    onClose,
}: {
    employee: EmployeeRecord | null;
    nextEmployeeCode: string;
    onClose: () => void;
}) {
    const isEditing = !!employee;
    const todayStr = new Date().toISOString().slice(0, 10);

    const { data, setData, post, put, processing, errors } = useForm({
        name: employee?.name ?? '',
        email: employee?.email ?? '',
        password: '',
        phone: employee?.phone ?? '',
        role: (employee?.role ?? 'employee') as 'super_admin' | 'admin' | 'employee',
        employee_code: employee?.employee_code ?? nextEmployeeCode,
        position: employee?.position ?? 'Arsitek',
        department: employee?.department ?? 'Perencanaan',
        work_type: (employee?.work_type ?? 'kantor') as 'kantor' | 'lapangan',
        join_date: employee?.join_date ?? todayStr,
        employment_status: (employee?.employment_status ?? 'tetap') as 'tetap' | 'kontrak' | 'magang',
        annual_leave_quota: employee?.annual_leave_quota ?? 12,
        base_salary: employee?.base_salary ?? 6000000,
        fixed_allowance: employee?.fixed_allowance ?? 500000,
        overtime_rate_per_hour: employee?.overtime_rate_per_hour ?? 25000,
        bank_name: employee?.bank_name ?? 'BCA',
        bank_account_number: employee?.bank_account_number ?? '',
        bank_account_holder: employee?.bank_account_holder ?? employee?.name ?? '',
        bank_branch: employee?.bank_branch ?? '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing && employee) {
            put(route('employees.update', employee.id), {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        } else {
            post(route('employees.store'), {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-xs"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="employee-modal-title"
                className="relative z-10 flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-card shadow-xl"
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div>
                        <h2 id="employee-modal-title" className="text-base font-semibold">
                            {isEditing ? `Edit Data Karyawan — ${employee.name}` : 'Daftarkan Karyawan Baru'}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {isEditing
                                ? 'Perbarui informasi akun, posisi studio, dan komponen gaji karyawan.'
                                : 'Akun yang dibuat dapat langsung digunakan karyawan untuk login ke dashboard.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="size-4" />
                        <span className="sr-only">Tutup</span>
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Section 1: Akun & Login */}
                    <div>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            <KeyRound className="size-3.5 text-primary" />
                            1. Akun & Kredensial Login
                        </h3>
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-medium">Nama Lengkap *</label>
                                <input
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => {
                                        setData((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                            bank_account_holder:
                                                prev.bank_account_holder === prev.name || !prev.bank_account_holder
                                                    ? e.target.value
                                                    : prev.bank_account_holder,
                                        }));
                                    }}
                                    placeholder="Contoh: Budi Santoso"
                                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                                />
                                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Email Kantor (Username Login) *</label>
                                <input
                                    type="email"
                                    required
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="nama@rimstudio.com"
                                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                                />
                                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">
                                    {isEditing ? 'Reset Kata Sandi (Opsional)' : 'Kata Sandi Awal *'}
                                </label>
                                <input
                                    type="password"
                                    required={!isEditing}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder={isEditing ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'}
                                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                                />
                                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Nomor WhatsApp / HP</label>
                                <input
                                    type="text"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="0812xxxxxxxx"
                                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                                />
                                {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Data Kepegawaian Studio */}
                    <div className="border-t pt-5">
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            <Building2 className="size-3.5 text-primary" />
                            2. Data Kepegawaian Studio
                        </h3>
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium">Kode NIK Studio *</label>
                                <input
                                    type="text"
                                    required
                                    value={data.employee_code}
                                    onChange={(e) => setData('employee_code', e.target.value)}
                                    placeholder="RIM-007"
                                    className="h-9 w-full rounded-lg border bg-background px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                                />
                                {errors.employee_code && <p className="mt-1 text-xs text-destructive">{errors.employee_code}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Jabatan Arsitektur *</label>
                                <input
                                    type="text"
                                    list="position-suggestions"
                                    required
                                    value={data.position}
                                    onChange={(e) => setData('position', e.target.value)}
                                    placeholder="Pilih atau ketik jabatan"
                                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                                />
                                <datalist id="position-suggestions">
                                    {positionSuggestions.map((pos) => (
                                        <option key={pos} value={pos} />
                                    ))}
                                </datalist>
                                {errors.position && <p className="mt-1 text-xs text-destructive">{errors.position}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Divisi / Departemen *</label>
                                <select
                                    value={data.department}
                                    onChange={(e) => setData('department', e.target.value)}
                                    className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring"
                                >
                                    {departmentOptions.map((dept) => (
                                        <option key={dept} value={dept}>
                                            {dept}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Tipe Karyawan *</label>
                                <select
                                    value={data.work_type}
                                    onChange={(e) => setData('work_type', e.target.value as 'kantor' | 'lapangan')}
                                    className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring"
                                >
                                    <option value="kantor">Karyawan Kantor (Absen Kantor / Site Visit)</option>
                                    <option value="lapangan">Karyawan Lapangan (Site Visit Proyek Pembangunan)</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Status Kepegawaian *</label>
                                <select
                                    value={data.employment_status}
                                    onChange={(e) =>
                                        setData('employment_status', e.target.value as 'tetap' | 'kontrak' | 'magang')
                                    }
                                    className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring"
                                >
                                    <option value="tetap">Karyawan Tetap</option>
                                    <option value="kontrak">Karyawan Kontrak</option>
                                    <option value="magang">Staf Magang</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Tanggal Bergabung *</label>
                                <input
                                    type="date"
                                    required
                                    value={data.join_date}
                                    onChange={(e) => setData('join_date', e.target.value)}
                                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring"
                                />
                                {errors.join_date && <p className="mt-1 text-xs text-destructive">{errors.join_date}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Peran Akses Dashboard *</label>
                                <select
                                    value={data.role}
                                    onChange={(e) =>
                                        setData('role', e.target.value as 'super_admin' | 'admin' | 'employee')
                                    }
                                    className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring"
                                >
                                    <option value="employee">Karyawan Studio</option>
                                    <option value="admin">Admin Biasa (Proyek, Presensi Harian &amp; Kalender Tim)</option>
                                    <option value="super_admin">Super Admin (Akses Penuh Semua Fitur)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Finansial & Rekening Payroll */}
                    <div className="border-t pt-5">
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            <Wallet className="size-3.5 text-primary" />
                            3. Komponen Gaji & Rekening Bank (BCA / BNI)
                        </h3>
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium">Gaji Pokok *</label>
                                <CurrencyInput
                                    value={data.base_salary}
                                    onChange={(val) => setData('base_salary', val)}
                                />
                                {errors.base_salary && <p className="mt-1 text-xs text-destructive">{errors.base_salary}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Tunjangan Tetap</label>
                                <CurrencyInput
                                    value={data.fixed_allowance}
                                    onChange={(val) => setData('fixed_allowance', val)}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Tarif Lembur / Jam</label>
                                <CurrencyInput
                                    value={data.overtime_rate_per_hour}
                                    onChange={(val) => setData('overtime_rate_per_hour', val)}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Bank Transfer Payroll</label>
                                <select
                                    value={data.bank_name}
                                    onChange={(e) => setData('bank_name', e.target.value)}
                                    className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring"
                                >
                                    <option value="BCA">BCA (KlikBCA Bisnis)</option>
                                    <option value="BNI">BNI (BNI Direct)</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Nomor Rekening</label>
                                <input
                                    type="text"
                                    value={data.bank_account_number}
                                    onChange={(e) => setData('bank_account_number', e.target.value)}
                                    placeholder="Contoh: 7410293812"
                                    className="h-9 w-full rounded-lg border bg-background px-3 font-mono text-sm outline-none focus-visible:border-ring"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Nama Pemilik Rekening</label>
                                <input
                                    type="text"
                                    value={data.bank_account_holder}
                                    onChange={(e) => setData('bank_account_holder', e.target.value)}
                                    placeholder="Sesuai buku tabungan"
                                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <label className="mb-1 block text-xs font-medium">Kantor Cabang Bank</label>
                                <input
                                    type="text"
                                    value={data.bank_branch}
                                    onChange={(e) => setData('bank_branch', e.target.value)}
                                    placeholder="Contoh: TASIKMALAYA / BANDUNG / JAKARTA"
                                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm uppercase outline-none focus-visible:border-ring"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex items-center justify-end gap-2 border-t pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-9 rounded-lg border bg-card px-4 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                            {processing
                                ? 'Menyimpan…'
                                : isEditing
                                ? 'Simpan Perubahan'
                                : 'Daftarkan Karyawan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
