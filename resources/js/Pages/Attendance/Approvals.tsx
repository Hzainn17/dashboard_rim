import * as React from 'react';
import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    CalendarCheck2,
    Check,
    CheckCircle2,
    Clock,
    FileText,
    HardHat,
    Lock,
    MapPin,
    Sparkles,
    Timer,
    X,
} from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';

type SiteVisitItem = {
    id: number;
    user_id: number;
    user_name: string;
    employee_code: string;
    position: string;
    date: string;
    mode: 'office' | 'site_visit';
    is_weekend: boolean;
    compensation_type: 'none' | 'overtime' | 'day_off_exchange';
    exchange_date?: string | null;
    compensation_status: 'none' | 'pending' | 'approved' | 'rejected';
    check_in_time?: string | null;
    check_out_time?: string | null;
    site_visit_project_name?: string | null;
    site_visit_photo_url?: string | null;
    site_visit_status: 'none' | 'pending' | 'approved' | 'rejected';
    notes?: string | null;
};

type LeaveRequestItem = {
    id: number;
    user_id: number;
    user_name: string;
    employee_code: string;
    position: string;
    annual_leave_quota: number;
    type: 'izin' | 'cuti' | 'sakit';
    start_date: string;
    end_date: string;
    total_days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
};

type OvertimeItem = {
    id: number;
    user_id: number;
    user_name: string;
    employee_code: string;
    position: string;
    project_name: string;
    source: 'regular' | 'weekend' | 'manual';
    date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    task_description?: string | null;
    status: 'pending' | 'approved' | 'rejected';
};

type AdjustmentItem = {
    id: number;
    user_id: number;
    user_name: string;
    employee_code: string;
    position: string;
    date: string;
    mode: 'office' | 'site_visit';
    adjustment_type: 'none' | 'check_in' | 'check_out' | 'full_day';
    adjustment_status: 'none' | 'pending' | 'approved' | 'rejected';
    check_in_time?: string | null;
    check_out_time?: string | null;
    adjusted_check_in_time?: string | null;
    adjusted_check_out_time?: string | null;
    adjustment_reason?: string | null;
};

interface Props {
    siteVisits: SiteVisitItem[];
    leaveRequests: LeaveRequestItem[];
    overtimes: OvertimeItem[];
    adjustments?: AdjustmentItem[];
    counts: {
        site_visit_pending: number;
        leave_pending: number;
        overtime_pending: number;
        adjustment_pending?: number;
    };
}

export default function AttendanceApprovals({
    siteVisits,
    leaveRequests,
    overtimes,
    adjustments = [],
    counts,
}: Props) {
    const { auth, flash } = usePage<PageProps>().props;
    const initialRole = auth?.user?.role === 'admin' ? 'admin' : 'karyawan';

    const [activeTab, setActiveTab] = useState<'site_visit' | 'leave' | 'overtime' | 'adjustment'>('site_visit');

    const handleSiteVisitAction = (id: number, action: 'approve' | 'reject') => {
        router.patch(
            route('attendance.approvals.site-visit', id),
            { action },
            { preserveScroll: true },
        );
    };

    const handleLeaveAction = (id: number, action: 'approve' | 'reject') => {
        router.patch(
            route('attendance.approvals.leave', id),
            { action },
            { preserveScroll: true },
        );
    };

    const handleOvertimeAction = (id: number, action: 'approve' | 'reject') => {
        router.patch(
            route('attendance.approvals.overtime', id),
            { action },
            { preserveScroll: true },
        );
    };

    const handleAdjustmentAction = (id: number, action: 'approve' | 'reject') => {
        router.patch(
            route('attendance.approvals.adjustment', id),
            { action },
            { preserveScroll: true },
        );
    };

    const adjustmentPendingCount = counts.adjustment_pending ?? 0;
    const totalPending =
        counts.site_visit_pending + counts.leave_pending + counts.overtime_pending + adjustmentPendingCount;

    return (
        <>
            <Head title="Pusat Approval" />
            <AppShell initialRole={initialRole} initialActive="presensi-approval">
                <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                    {/* Header */}
                    <div className="flex flex-col gap-1">
                        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                            Verifikasi Operasional Tim Studio
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                            Pusat Approval{' '}
                            <span className="font-normal text-muted-foreground">
                                ({totalPending} menunggu verifikasi)
                            </span>
                        </h1>
                    </div>

                    {flash?.success && (
                        <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                            <CheckCircle2 className="size-4 shrink-0" />
                            <span>{flash.success}</span>
                        </div>
                    )}

                    {/* 4 Summary Cards */}
                    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <button
                            type="button"
                            onClick={() => setActiveTab('site_visit')}
                            className={cn(
                                'flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors',
                                activeTab === 'site_visit' && 'border-primary bg-accent/30',
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Site Visit & Ganti Hari Weekend
                                </span>
                                <HardHat className="size-4 text-primary" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-semibold tabular-nums">
                                    {counts.site_visit_pending}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    menunggu dari {siteVisits.length} catatan
                                </span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('leave')}
                            className={cn(
                                'flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors',
                                activeTab === 'leave' && 'border-primary bg-accent/30',
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Permohonan Izin, Cuti & Sakit
                                </span>
                                <CalendarCheck2 className="size-4 text-primary" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-semibold tabular-nums">
                                    {counts.leave_pending}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    menunggu dari {leaveRequests.length} pengajuan
                                </span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('overtime')}
                            className={cn(
                                'flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors',
                                activeTab === 'overtime' && 'border-primary bg-accent/30',
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Lembur Malam & Proyek
                                </span>
                                <Timer className="size-4 text-primary" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-semibold tabular-nums">
                                    {counts.overtime_pending}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    menunggu dari {overtimes.length} sesi lembur
                                </span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('adjustment')}
                            className={cn(
                                'flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors',
                                activeTab === 'adjustment' && 'border-primary bg-accent/30',
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Koreksi Jam & Lupa Absen
                                </span>
                                <Clock className="size-4 text-primary" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-semibold tabular-nums">
                                    {adjustmentPendingCount}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    menunggu dari {adjustments.length} pengajuan
                                </span>
                            </div>
                        </button>
                    </section>

                    {/* Main Tab Card */}
                    <section className="flex flex-col rounded-xl border bg-card">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
                            <div role="tablist" className="flex flex-wrap gap-1 rounded-lg border bg-muted/50 p-1">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === 'site_visit'}
                                    onClick={() => setActiveTab('site_visit')}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                        activeTab === 'site_visit'
                                            ? 'bg-card text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <HardHat className="size-3.5" />
                                    Site Visit & Weekend
                                    {counts.site_visit_pending > 0 && (
                                        <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
                                            {counts.site_visit_pending}
                                        </span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === 'leave'}
                                    onClick={() => setActiveTab('leave')}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                        activeTab === 'leave'
                                            ? 'bg-card text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <FileText className="size-3.5" />
                                    Izin & Cuti
                                    {counts.leave_pending > 0 && (
                                        <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
                                            {counts.leave_pending}
                                        </span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === 'overtime'}
                                    onClick={() => setActiveTab('overtime')}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                        activeTab === 'overtime'
                                            ? 'bg-card text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <Timer className="size-3.5" />
                                    Lembur Malam
                                    {counts.overtime_pending > 0 && (
                                        <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
                                            {counts.overtime_pending}
                                        </span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === 'adjustment'}
                                    onClick={() => setActiveTab('adjustment')}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                        activeTab === 'adjustment'
                                            ? 'bg-card text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <Clock className="size-3.5" />
                                    Koreksi Presensi
                                    {adjustmentPendingCount > 0 && (
                                        <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
                                            {adjustmentPendingCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Tab 1: Site Visit & Weekend Compensation */}
                        {activeTab === 'site_visit' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                            <th className="px-5 py-3">Karyawan</th>
                                            <th className="px-4 py-3">Tanggal & Jam</th>
                                            <th className="px-4 py-3">Proyek / Jenis</th>
                                            <th className="px-4 py-3">Bukti / Kompensasi</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-5 py-3 text-right">Keputusan Admin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {siteVisits.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="px-5 py-12 text-center text-sm text-muted-foreground"
                                                >
                                                    Tidak ada antrean verifikasi Site Visit atau kompensasi akhir pekan.
                                                </td>
                                            </tr>
                                        ) : (
                                            siteVisits.map((sv) => {
                                                const isPending =
                                                    sv.site_visit_status === 'pending' ||
                                                    sv.compensation_status === 'pending';
                                                const currentStatus =
                                                    sv.mode === 'site_visit'
                                                        ? sv.site_visit_status
                                                        : sv.compensation_status;

                                                return (
                                                    <tr key={sv.id} className="hover:bg-muted/30">
                                                        <td className="px-5 py-3.5">
                                                            <p className="font-medium">{sv.user_name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                <span className="font-mono">{sv.employee_code}</span> ·{' '}
                                                                {sv.position}
                                                            </p>
                                                        </td>
                                                        <td className="px-4 py-3.5 font-mono text-xs">
                                                            <p className="font-medium">{sv.date}</p>
                                                            <p className="text-muted-foreground">
                                                                {sv.check_in_time ?? '08:30'} –{' '}
                                                                {sv.check_out_time ?? ' Aktif'}
                                                            </p>
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <div className="flex flex-col gap-0.5">
                                                                {sv.mode === 'site_visit' && (
                                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                                                                        <MapPin className="size-3.5" />
                                                                        {sv.site_visit_project_name || 'Proyek Lapangan'}
                                                                    </span>
                                                                )}
                                                                {sv.is_weekend && (
                                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
                                                                        <Sparkles className="size-3.5" />
                                                                        Kerja Akhir Pekan
                                                                    </span>
                                                                )}
                                                                <span className="text-xs text-muted-foreground">
                                                                    {sv.notes || 'Kunjungan teknis lapangan'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <div className="flex flex-col gap-1.5">
                                                                {sv.site_visit_photo_url && (
                                                                    <img
                                                                        src={sv.site_visit_photo_url}
                                                                        alt="Bukti Site Visit"
                                                                        className="h-12 w-20 rounded-md border object-cover"
                                                                    />
                                                                )}
                                                                {sv.is_weekend && (
                                                                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
                                                                        <Lock className="size-3" />
                                                                        {sv.compensation_type === 'day_off_exchange'
                                                                            ? `Ganti Hari: Lock ${sv.exchange_date}`
                                                                            : 'Opsi: Uang Lembur Weekend'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <span
                                                                className={cn(
                                                                    'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize',
                                                                    currentStatus === 'approved'
                                                                        ? 'bg-success/15 text-success'
                                                                        : currentStatus === 'rejected'
                                                                        ? 'bg-destructive/15 text-destructive'
                                                                        : 'bg-warning/20 text-amber-800',
                                                                )}
                                                            >
                                                                {currentStatus}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            {isPending ? (
                                                                <div className="inline-flex items-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleSiteVisitAction(sv.id, 'approve')
                                                                        }
                                                                        className="inline-flex h-8 items-center gap-1 rounded-md bg-success px-2.5 text-xs font-medium text-success-foreground hover:bg-success/90"
                                                                    >
                                                                        <Check className="size-3.5" />
                                                                        Setujui
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleSiteVisitAction(sv.id, 'reject')
                                                                        }
                                                                        className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                                                                    >
                                                                        <X className="size-3.5" />
                                                                        Tolak
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Selesai diverifikasi
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Tab 2: Leave Requests (Izin / Cuti / Sakit) */}
                        {activeTab === 'leave' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                            <th className="px-5 py-3">Karyawan</th>
                                            <th className="px-4 py-3">Tipe</th>
                                            <th className="px-4 py-3">Rentang Tanggal</th>
                                            <th className="px-4 py-3">Durasi & Kuota</th>
                                            <th className="px-4 py-3">Alasan</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-5 py-3 text-right">Keputusan Admin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {leaveRequests.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={7}
                                                    className="px-5 py-12 text-center text-sm text-muted-foreground"
                                                >
                                                    Tidak ada permohonan izin, cuti, atau sakit.
                                                </td>
                                            </tr>
                                        ) : (
                                            leaveRequests.map((lr) => (
                                                <tr key={lr.id} className="hover:bg-muted/30">
                                                    <td className="px-5 py-3.5">
                                                        <p className="font-medium">{lr.user_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            <span className="font-mono">{lr.employee_code}</span> ·{' '}
                                                            {lr.position}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium capitalize text-accent-foreground">
                                                            {lr.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 font-mono text-xs">
                                                        {lr.start_date} s/d {lr.end_date}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs">
                                                        <p className="font-medium">{lr.total_days} hari kerja</p>
                                                        <p className="text-muted-foreground">
                                                            Kuota tahunan: {lr.annual_leave_quota} hari
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                                                        {lr.reason}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span
                                                            className={cn(
                                                                'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize',
                                                                lr.status === 'approved'
                                                                    ? 'bg-success/15 text-success'
                                                                    : lr.status === 'rejected'
                                                                    ? 'bg-destructive/15 text-destructive'
                                                                    : 'bg-warning/20 text-amber-800',
                                                            )}
                                                        >
                                                            {lr.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        {lr.status === 'pending' ? (
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleLeaveAction(lr.id, 'approve')
                                                                    }
                                                                    className="inline-flex h-8 items-center gap-1 rounded-md bg-success px-2.5 text-xs font-medium text-success-foreground hover:bg-success/90"
                                                                >
                                                                    <Check className="size-3.5" />
                                                                    Setujui
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleLeaveAction(lr.id, 'reject')
                                                                    }
                                                                    className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                                                                >
                                                                    <X className="size-3.5" />
                                                                    Tolak
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">
                                                                Selesai diverifikasi
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Tab 3: Overtime Submissions */}
                        {activeTab === 'overtime' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                            <th className="px-5 py-3">Karyawan</th>
                                            <th className="px-4 py-3">Proyek & Uraian Tugas</th>
                                            <th className="px-4 py-3">Tanggal & Jam</th>
                                            <th className="px-4 py-3">Durasi Lembur</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-5 py-3 text-right">Keputusan Admin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {overtimes.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="px-5 py-12 text-center text-sm text-muted-foreground"
                                                >
                                                    Tidak ada pengajuan lembur malam atau lembur akhir pekan.
                                                </td>
                                            </tr>
                                        ) : (
                                            overtimes.map((ot) => (
                                                <tr key={ot.id} className="hover:bg-muted/30">
                                                    <td className="px-5 py-3.5">
                                                        <p className="font-medium">{ot.user_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            <span className="font-mono">{ot.employee_code}</span> ·{' '}
                                                            {ot.position}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <p className="font-medium text-primary">
                                                            {ot.project_name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {ot.task_description || 'Lembur penyelesaian gambar'}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3.5 font-mono text-xs">
                                                        <p>{ot.date}</p>
                                                        <p className="text-muted-foreground">
                                                            {ot.start_time} – {ot.end_time} WIB
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3.5 font-mono text-xs font-semibold">
                                                        {Math.round((ot.duration_minutes / 60) * 10) / 10} jam ({ot.duration_minutes} mnt)
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span
                                                            className={cn(
                                                                'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize',
                                                                ot.status === 'approved'
                                                                    ? 'bg-success/15 text-success'
                                                                    : ot.status === 'rejected'
                                                                    ? 'bg-destructive/15 text-destructive'
                                                                    : 'bg-warning/20 text-amber-800',
                                                            )}
                                                        >
                                                            {ot.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        {ot.status === 'pending' ? (
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleOvertimeAction(ot.id, 'approve')
                                                                    }
                                                                    className="inline-flex h-8 items-center gap-1 rounded-md bg-success px-2.5 text-xs font-medium text-success-foreground hover:bg-success/90"
                                                                >
                                                                    <Check className="size-3.5" />
                                                                    Setujui
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleOvertimeAction(ot.id, 'reject')
                                                                    }
                                                                    className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                                                                >
                                                                    <X className="size-3.5" />
                                                                    Tolak
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">
                                                                Selesai diverifikasi
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Tab 4: Koreksi Presensi (Lupa Absen Masuk / Pulang / Seharian) */}
                        {activeTab === 'adjustment' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                            <th className="px-5 py-3">Karyawan</th>
                                            <th className="px-4 py-3">Tanggal & Jenis</th>
                                            <th className="px-4 py-3">Jam Asli vs Koreksi</th>
                                            <th className="px-4 py-3">Alasan Pengajuan</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-5 py-3 text-right">Keputusan Admin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {adjustments.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                                                >
                                                    Belum ada pengajuan koreksi presensi dari karyawan.
                                                </td>
                                            </tr>
                                        ) : (
                                            adjustments.map((adj) => (
                                                <tr key={adj.id} className="hover:bg-muted/30">
                                                    <td className="px-5 py-3.5">
                                                        <p className="font-medium">{adj.user_name}</p>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {adj.employee_code} · {adj.position}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <p className="font-mono text-xs">{adj.date}</p>
                                                        <span className="mt-1 inline-flex rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                                                            {adj.adjustment_type === 'check_in'
                                                                ? 'Koreksi Jam Masuk'
                                                                : adj.adjustment_type === 'check_out'
                                                                ? 'Koreksi Jam Pulang'
                                                                : 'Absen Susulan Seharian'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs">
                                                        <div className="flex flex-col gap-0.5 font-mono">
                                                            <span className="text-muted-foreground">
                                                                Asli: {adj.check_in_time ?? '—'} s/d {adj.check_out_time ?? '—'}
                                                            </span>
                                                            <span className="font-semibold text-primary">
                                                                Koreksi: {adj.adjusted_check_in_time ?? adj.check_in_time ?? '—'} s/d{' '}
                                                                {adj.adjusted_check_out_time ?? adj.check_out_time ?? '—'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-xs">
                                                        {adj.adjustment_reason || '—'}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span
                                                            className={cn(
                                                                'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize',
                                                                adj.adjustment_status === 'approved'
                                                                    ? 'bg-success/15 text-success'
                                                                    : adj.adjustment_status === 'rejected'
                                                                    ? 'bg-destructive/15 text-destructive'
                                                                    : 'bg-warning/20 text-amber-800',
                                                            )}
                                                        >
                                                            {adj.adjustment_status}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        {adj.adjustment_status === 'pending' ? (
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleAdjustmentAction(adj.id, 'approve')
                                                                    }
                                                                    className="inline-flex h-8 items-center gap-1 rounded-md bg-success px-2.5 text-xs font-medium text-success-foreground hover:bg-success/90"
                                                                >
                                                                    <Check className="size-3.5" />
                                                                    Setujui
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleAdjustmentAction(adj.id, 'reject')
                                                                    }
                                                                    className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                                                                >
                                                                    <X className="size-3.5" />
                                                                    Tolak
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">
                                                                Selesai diverifikasi
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </AppShell>
        </>
    );
}
