import * as React from 'react';
import { useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Building2,
    CalendarCheck,
    CalendarDays,
    CheckCircle2,
    ClockAlert,
    Download,
    HardHat,
    List,
    PencilLine,
    SlidersHorizontal,
    Timer,
    X,
} from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';

type RecapRow = {
    user_id: number;
    name: string;
    employee_code: string;
    position: string;
    department: string;
    work_type?: 'kantor' | 'lapangan';
    present_days: number;
    site_visit_days: number;
    kurang_jam_days: number;
    shortage_minutes: number;
    leave_days: number;
    ganti_hari_days: number;
    alpha_days: number;
    overtime_hours: number;
};

type RecentLog = {
    id: number;
    user_id: number;
    user_name: string;
    employee_code: string;
    date: string;
    mode: 'office' | 'site_visit' | 'wfh';
    check_in_time?: string | null;
    check_out_time?: string | null;
    actual_work_minutes?: number | null;
    shortage_minutes: number;
    status: string;
    notes?: string | null;
    site_visit_project_name?: string | null;
};

type OvertimeLog = {
    id: number;
    user_id: number;
    user_name: string;
    employee_code: string;
    project_id?: number | null;
    project_name: string;
    source: 'regular' | 'weekend' | 'manual';
    date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    task_description: string;
    status: 'approved' | 'pending' | 'rejected';
};

interface Props {
    todayTracker: {
        office_present: number;
        site_visit: number;
        leave_or_exchange: number;
        not_yet_present: number;
        total_team: number;
    };
    monthlyRecap: RecapRow[];
    recentLogs: RecentLog[];
    overtimeLogs: OvertimeLog[];
    projects: Array<{ id: number; name: string }>;
    employees: Array<{ id: number; name: string; employee_code: string }>;
    filters: {
        month: number;
        year: number;
    };
}

const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
];

export default function AttendanceMonitoring({
    todayTracker,
    monthlyRecap,
    recentLogs,
    overtimeLogs = [],
    projects = [],
    employees,
    filters,
}: Props) {
    const { auth, flash } = usePage<PageProps>().props;
    const isAdmin = auth?.user?.role === 'super_admin' || auth?.user?.role === 'admin';
    const initialRole = isAdmin ? 'admin' : 'karyawan';

    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [adjustTab, setAdjustTab] = useState<'attendance' | 'overtime'>('attendance');
    const [logTab, setLogTab] = useState<'attendance' | 'overtime'>('attendance');
    const [attendanceView, setAttendanceView] = useState<'calendar' | 'table'>('calendar');
    const [selectedCell, setSelectedCell] = useState<{
        employee: RecapRow;
        dateStr: string;
        dayLabel: string;
        log: RecentLog | null;
    } | null>(null);

    const todayStr = new Date().toISOString().slice(0, 10);

    const weekdayShorts = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'];
    const daysInMonth = useMemo(() => {
        const count = new Date(filters.year, filters.month, 0).getDate();
        return Array.from({ length: count }, (_, idx) => {
            const day = idx + 1;
            const dateObj = new Date(filters.year, filters.month - 1, day);
            const dateStr = `${filters.year}-${String(filters.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dow = dateObj.getDay();
            return {
                day,
                dateStr,
                dow,
                shortDay: weekdayShorts[dow],
                isToday: dateStr === todayStr,
            };
        });
    }, [filters.year, filters.month, todayStr]);

    const attendanceLookup = useMemo(() => {
        const map = new Map<string, RecentLog>();
        for (const log of recentLogs) {
            map.set(`${log.user_id}-${log.date}`, log);
        }
        return map;
    }, [recentLogs]);

    const getCellBadge = (log: RecentLog) => {
        if (log.status === 'alpha') {
            return { code: 'A', label: 'Alpha', cls: 'bg-rose-100 text-rose-800 ring-rose-300' };
        }
        if (log.status === 'izin') {
            return { code: 'I', label: 'Izin', cls: 'bg-purple-100 text-purple-800 ring-purple-300' };
        }
        if (log.status === 'sakit') {
            return { code: 'S', label: 'Sakit', cls: 'bg-purple-100 text-purple-800 ring-purple-300' };
        }
        if (log.status === 'cuti') {
            return { code: 'C', label: 'Cuti', cls: 'bg-purple-100 text-purple-800 ring-purple-300' };
        }
        if (log.status === 'ganti_hari') {
            return { code: 'GH', label: 'Ganti Hari', cls: 'bg-indigo-100 text-indigo-800 ring-indigo-300' };
        }
        if (log.status === 'kurang_jam') {
            return { code: 'KJ', label: 'Kurang Jam', cls: 'bg-orange-100 text-orange-800 ring-orange-300' };
        }
        if (log.mode === 'site_visit' || log.status === 'site_visit') {
            return { code: 'SV', label: 'Site Visit', cls: 'bg-amber-100 text-amber-900 ring-amber-300' };
        }
        if (log.mode === 'wfh') {
            return { code: 'WFH', label: 'WFH', cls: 'bg-sky-100 text-sky-800 ring-sky-300' };
        }
        return { code: 'H', label: 'Hadir', cls: 'bg-emerald-100 text-emerald-800 ring-emerald-300' };
    };

    // Form 1: Attendance Adjustment (with optional overtime minutes)
    const adjustForm = useForm({
        adjust_type: 'attendance',
        user_id: employees[0]?.id ?? 1,
        date: todayStr,
        mode: 'office' as 'office' | 'site_visit' | 'wfh',
        status: 'hadir' as
            | 'hadir'
            | 'kurang_jam'
            | 'izin'
            | 'sakit'
            | 'cuti'
            | 'alpha'
            | 'site_visit'
            | 'ganti_hari',
        check_in_time: '08:00',
        check_out_time: '17:00',
        overtime_minutes: 0,
        overtime_project_id: projects[0]?.id ?? '',
        notes: '',
    });

    // Form 2: Dedicated Overtime Manual Input / Correction
    const overtimeAdjustForm = useForm({
        adjust_type: 'overtime',
        overtime_id: null as number | null,
        user_id: employees[0]?.id ?? 1,
        date: todayStr,
        project_id: projects[0]?.id ?? '',
        start_time: '19:00',
        duration_minutes: 120,
        status: 'approved' as 'approved' | 'pending' | 'rejected',
        task_description: '',
    });

    const openAttendanceAdjust = (
        userId?: number,
        presetDate?: string,
        existingLog?: RecentLog | null,
    ) => {
        if (existingLog) {
            adjustForm.setData({
                adjust_type: 'attendance',
                user_id: existingLog.user_id,
                date: existingLog.date,
                mode: existingLog.mode,
                status: existingLog.status as typeof adjustForm.data.status,
                check_in_time: existingLog.check_in_time || '08:00',
                check_out_time: existingLog.check_out_time || '17:00',
                overtime_minutes: 0,
                overtime_project_id: projects[0]?.id ?? '',
                notes: existingLog.notes || '',
            });
        } else {
            if (userId) {
                adjustForm.setData('user_id', userId);
            }
            if (presetDate) {
                adjustForm.setData('date', presetDate);
            }
        }
        setAdjustTab('attendance');
        setAdjustModalOpen(true);
    };

    const openOvertimeAdjust = (userId?: number, existingOt?: OvertimeLog) => {
        if (existingOt) {
            overtimeAdjustForm.setData({
                adjust_type: 'overtime',
                overtime_id: existingOt.id,
                user_id: existingOt.user_id,
                date: existingOt.date,
                project_id: existingOt.project_id ?? projects[0]?.id ?? '',
                start_time: existingOt.start_time || '19:00',
                duration_minutes: existingOt.duration_minutes,
                status: existingOt.status,
                task_description: existingOt.task_description.replace(/^\[Koreksi Admin\]\s*/, ''),
            });
        } else {
            overtimeAdjustForm.setData({
                adjust_type: 'overtime',
                overtime_id: null,
                user_id: userId ?? employees[0]?.id ?? 1,
                date: todayStr,
                project_id: projects[0]?.id ?? '',
                start_time: '19:00',
                duration_minutes: 120,
                status: 'approved',
                task_description: '',
            });
        }
        setAdjustTab('overtime');
        setAdjustModalOpen(true);
    };

    const handleFilterChange = (nextMonth: number, nextYear: number) => {
        router.get(
            route('attendance.monitoring'),
            { month: nextMonth, year: nextYear },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleAttendanceAdjustSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        adjustForm.post(route('attendance.monitoring.adjust'), {
            preserveScroll: true,
            onSuccess: () => {
                setAdjustModalOpen(false);
                adjustForm.reset('notes', 'overtime_minutes');
            },
        });
    };

    const handleOvertimeAdjustSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        overtimeAdjustForm.post(route('attendance.monitoring.adjust'), {
            preserveScroll: true,
            onSuccess: () => {
                setAdjustModalOpen(false);
                overtimeAdjustForm.reset('task_description', 'overtime_id');
            },
        });
    };

    const trackerCards = [
        {
            label: 'Hadir di Kantor Hari Ini',
            value: String(todayTracker.office_present),
            suffix: `/${todayTracker.total_team}`,
            hint: 'Staf hadir dalam radius GPS studio',
            icon: Building2,
            ratio:
                todayTracker.total_team > 0
                    ? todayTracker.office_present / todayTracker.total_team
                    : 0,
        },
        {
            label: 'Site Visit Lapangan',
            value: String(todayTracker.site_visit),
            suffix: 'tim',
            hint: 'Sedang bertugas di lokasi proyek',
            icon: HardHat,
            ratio:
                todayTracker.total_team > 0
                    ? todayTracker.site_visit / todayTracker.total_team
                    : 0,
        },
        {
            label: 'Izin / Cuti / Ganti Hari',
            value: String(todayTracker.leave_or_exchange),
            suffix: 'orang',
            hint: 'Status terkunci & tidak dihitung alpha',
            icon: CalendarCheck,
            ratio:
                todayTracker.total_team > 0
                    ? todayTracker.leave_or_exchange / todayTracker.total_team
                    : 0,
        },
        {
            label: 'Belum Check-in',
            value: String(todayTracker.not_yet_present),
            suffix: 'orang',
            hint: 'Belum tercatat absensi hari ini',
            icon: ClockAlert,
            ratio:
                todayTracker.total_team > 0
                    ? todayTracker.not_yet_present / todayTracker.total_team
                    : 0,
        },
    ];

    return (
        <>
            <Head title="Rekap & Monitoring" />
            <AppShell initialRole={initialRole} initialActive="presensi-rekap">
                <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                    {/* Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                Live Tracker & Rekap Bulanan Payroll
                            </p>
                            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                                Rekap & Monitoring Tim
                            </h1>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => openAttendanceAdjust()}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                            >
                                <PencilLine className="size-3.5" />
                                Koreksi Absen Manual
                            </button>
                            <button
                                type="button"
                                onClick={() => openOvertimeAdjust()}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                            >
                                <Timer className="size-3.5 text-primary" />
                                Koreksi / Input Lembur Manual
                            </button>
                            <a
                                href={route('attendance.monitoring.export', {
                                    month: filters.month,
                                    year: filters.year,
                                })}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                                <Download className="size-3.5" />
                                Ekspor CSV Rekap
                            </a>
                        </div>
                    </div>

                    {flash?.success && (
                        <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                            <CheckCircle2 className="size-4 shrink-0" />
                            <span>{flash.success}</span>
                        </div>
                    )}

                    {/* 4 Live Tracker Cards */}
                    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {trackerCards.map((m) => {
                            const Icon = m.icon;
                            return (
                                <div
                                    key={m.label}
                                    className="flex flex-col gap-3 rounded-xl border bg-card p-4"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {m.label}
                                        </p>
                                        <Icon className="size-4 text-muted-foreground" />
                                    </div>
                                    <p className="flex items-baseline gap-1">
                                        <span className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">
                                            {m.value}
                                        </span>
                                        <span className="text-sm text-muted-foreground">{m.suffix}</span>
                                    </p>
                                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-foreground/80"
                                            style={{ width: `${Math.min(100, m.ratio * 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">{m.hint}</p>
                                </div>
                            );
                        })}
                    </section>

                    {/* Monthly Recap Table */}
                    <section className="flex flex-col rounded-xl border bg-card">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                            <div>
                                <h2 className="text-sm font-semibold">
                                    Tabel Rekapitulasi Kehadiran & Lembur Bulanan
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Data kehadiran dan jam lembur ini otomatis ditarik saat kalkulasi Payroll Gaji
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                                <select
                                    value={filters.month}
                                    onChange={(e) =>
                                        handleFilterChange(Number(e.target.value), filters.year)
                                    }
                                    className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium outline-none"
                                >
                                    {monthNames.map((name, idx) => (
                                        <option key={name} value={idx + 1}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={filters.year}
                                    onChange={(e) =>
                                        handleFilterChange(filters.month, Number(e.target.value))
                                    }
                                    className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium outline-none"
                                >
                                    {[2025, 2026, 2027].map((yr) => (
                                        <option key={yr} value={yr}>
                                            {yr}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                        <th className="px-5 py-3">Karyawan</th>
                                        <th className="px-4 py-3">Divisi</th>
                                        <th className="px-4 py-3 text-center">Hari Hadir</th>
                                        <th className="px-4 py-3 text-center">Site Visit</th>
                                        <th className="px-4 py-3 text-center">Kurang Jam</th>
                                        <th className="px-4 py-3 text-center">Izin / Cuti</th>
                                        <th className="px-4 py-3 text-center">Ganti Hari</th>
                                        <th className="px-4 py-3 text-center">Lembur Approved</th>
                                        <th className="px-5 py-3 text-right">Koreksi Manual</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {monthlyRecap.map((row) => (
                                        <tr key={row.user_id} className="hover:bg-muted/30">
                                            <td className="px-5 py-3.5">
                                                <p className="font-medium">{row.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    <span className="font-mono text-primary">
                                                        {row.employee_code}
                                                    </span>{' '}
                                                    · {row.position}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-muted-foreground">
                                                {row.department}
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-mono text-xs font-semibold">
                                                {row.present_days} hr
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-mono text-xs">
                                                {row.site_visit_days} hr
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-mono text-xs">
                                                {row.shortage_minutes > 0 ? (
                                                    <span className="rounded bg-warning/20 px-2 py-0.5 text-amber-800">
                                                        {row.kurang_jam_days}x (-{row.shortage_minutes}m)
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">0</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-mono text-xs">
                                                {row.leave_days} hr
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-mono text-xs">
                                                {row.ganti_hari_days > 0 ? (
                                                    <span className="rounded bg-purple-50 px-2 py-0.5 text-purple-800">
                                                        {row.ganti_hari_days} hr
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">0</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-mono text-xs font-semibold text-success">
                                                +{row.overtime_hours} jam
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => openAttendanceAdjust(row.user_id)}
                                                        className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted"
                                                    >
                                                        <PencilLine className="size-3" />
                                                        Absen
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openOvertimeAdjust(row.user_id)}
                                                        className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium text-primary hover:bg-accent"
                                                    >
                                                        <Timer className="size-3" />
                                                        + Lembur
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Logs Section: Tabs for Daily Attendance Logs vs Overtime Logs */}
                    <section className="flex flex-col rounded-xl border bg-card">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
                            <div role="tablist" className="flex gap-1 rounded-lg border bg-muted/50 p-1">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={logTab === 'attendance'}
                                    onClick={() => setLogTab('attendance')}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                        logTab === 'attendance'
                                            ? 'bg-card text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <CalendarDays className="size-3.5" />
                                    Kalender Kehadiran ({monthNames[filters.month - 1]} {filters.year})
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={logTab === 'overtime'}
                                    onClick={() => setLogTab('overtime')}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                        logTab === 'overtime'
                                            ? 'bg-card text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <Timer className="size-3.5" />
                                    Log Data Lemburan ({overtimeLogs.length})
                                </button>
                            </div>

                            {logTab === 'attendance' && (
                                <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5 text-[11px]">
                                    <button
                                        type="button"
                                        onClick={() => setAttendanceView('calendar')}
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors',
                                            attendanceView === 'calendar'
                                                ? 'bg-card text-foreground shadow-2xs'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        <CalendarDays className="size-3" />
                                        Kalender
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAttendanceView('table')}
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors',
                                            attendanceView === 'table'
                                                ? 'bg-card text-foreground shadow-2xs'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        <List className="size-3" />
                                        Tabel ({recentLogs.length})
                                    </button>
                                </div>
                            )}
                        </div>

                        {logTab === 'attendance' ? (
                            attendanceView === 'calendar' ? (
                                <div className="flex flex-col">
                                    {/* Legend Bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-5 py-2.5 text-[11px]">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                                                <span className="inline-flex size-4 items-center justify-center rounded bg-emerald-100 text-[9px] font-bold text-emerald-800 ring-1 ring-emerald-300">
                                                    H
                                                </span>
                                                Hadir
                                            </span>
                                            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                                                <span className="inline-flex size-4 items-center justify-center rounded bg-amber-100 text-[9px] font-bold text-amber-900 ring-1 ring-amber-300">
                                                    SV
                                                </span>
                                                Site Visit
                                            </span>
                                            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                                                <span className="inline-flex h-4 items-center justify-center rounded bg-sky-100 px-1 text-[9px] font-bold text-sky-800 ring-1 ring-sky-300">
                                                    WFH
                                                </span>
                                                WFH
                                            </span>
                                            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                                                <span className="inline-flex size-4 items-center justify-center rounded bg-orange-100 text-[9px] font-bold text-orange-800 ring-1 ring-orange-300">
                                                    KJ
                                                </span>
                                                Kurang Jam
                                            </span>
                                            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                                                <span className="inline-flex size-4 items-center justify-center rounded bg-purple-100 text-[9px] font-bold text-purple-800 ring-1 ring-purple-300">
                                                    I
                                                </span>
                                                Izin / Sakit / Cuti
                                            </span>
                                            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                                                <span className="inline-flex size-4 items-center justify-center rounded bg-rose-100 text-[9px] font-bold text-rose-800 ring-1 ring-rose-300">
                                                    A
                                                </span>
                                                Alpha
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground">
                                            Klik sel tanggal untuk lihat detail jam kerja &amp; koreksi absen
                                        </span>
                                    </div>

                                    {/* Sticky-Column Calendar Matrix */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-left text-xs">
                                            <thead>
                                                <tr className="border-b bg-muted/40">
                                                    <th className="sticky left-0 z-20 min-w-[190px] border-r bg-card px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]">
                                                        Karyawan
                                                    </th>
                                                    {daysInMonth.map((d) => {
                                                        const isWeekendCol = d.dow === 0 || d.dow === 6;
                                                        return (
                                                            <th
                                                                key={d.dateStr}
                                                                className={cn(
                                                                    'min-w-[42px] border-r px-1 py-2 text-center font-medium last:border-r-0',
                                                                    d.isToday
                                                                        ? 'bg-primary text-primary-foreground'
                                                                        : isWeekendCol
                                                                          ? 'bg-muted/70 text-muted-foreground'
                                                                          : 'text-foreground',
                                                                )}
                                                            >
                                                                <div className="font-mono text-[11px] font-bold leading-none">
                                                                    {d.day}
                                                                </div>
                                                                <div
                                                                    className={cn(
                                                                        'mt-0.5 text-[9px]',
                                                                        d.isToday
                                                                            ? 'text-primary-foreground/90'
                                                                            : 'text-muted-foreground',
                                                                    )}
                                                                >
                                                                    {d.shortDay}
                                                                </div>
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {monthlyRecap.map((emp) => (
                                                    <tr key={emp.user_id} className="group hover:bg-muted/20">
                                                        <td className="sticky left-0 z-10 border-r bg-card px-4 py-2.5 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] group-hover:bg-muted/20">
                                                            <p className="truncate text-xs font-semibold text-foreground">
                                                                {emp.name}
                                                            </p>
                                                            <p className="truncate text-[10px] text-muted-foreground">
                                                                <span className="font-mono text-primary">
                                                                    {emp.employee_code}
                                                                </span>{' '}
                                                                · {emp.position}
                                                            </p>
                                                        </td>
                                                        {daysInMonth.map((d) => {
                                                            const log =
                                                                attendanceLookup.get(
                                                                    `${emp.user_id}-${d.dateStr}`,
                                                                ) ?? null;
                                                            const isOffDay =
                                                                emp.work_type === 'lapangan'
                                                                    ? d.dow === 0
                                                                    : d.dow === 0 || d.dow === 6;
                                                            const badge = log ? getCellBadge(log) : null;

                                                            return (
                                                                <td
                                                                    key={d.dateStr}
                                                                    className={cn(
                                                                        'border-r p-1 text-center align-middle last:border-r-0',
                                                                        d.isToday
                                                                            ? 'bg-primary/5'
                                                                            : isOffDay
                                                                              ? 'bg-muted/45'
                                                                              : '',
                                                                    )}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setSelectedCell({
                                                                                employee: emp,
                                                                                dateStr: d.dateStr,
                                                                                dayLabel: `${d.shortDay}, ${d.day} ${monthNames[filters.month - 1]} ${filters.year}`,
                                                                                log,
                                                                            })
                                                                        }
                                                                        title={
                                                                            log
                                                                                ? `${emp.name} · ${badge?.label} (${log.check_in_time ?? '--:--'} - ${log.check_out_time ?? '--:--'})`
                                                                                : `${emp.name} · ${d.dateStr} (Klik untuk input manual)`
                                                                        }
                                                                        className={cn(
                                                                            'flex h-9 w-full flex-col items-center justify-center rounded-md transition',
                                                                            badge
                                                                                ? cn(
                                                                                      'ring-1 hover:brightness-95',
                                                                                      badge.cls,
                                                                                  )
                                                                                : 'text-muted-foreground/40 hover:bg-muted hover:text-foreground',
                                                                        )}
                                                                    >
                                                                        {badge ? (
                                                                            <>
                                                                                <span className="text-[10px] font-bold leading-none">
                                                                                    {badge.code}
                                                                                </span>
                                                                                {log?.check_in_time && (
                                                                                    <span className="mt-0.5 font-mono text-[8px] leading-none opacity-80">
                                                                                        {log.check_in_time}
                                                                                    </span>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            <span className="text-[10px]">
                                                                                {isOffDay ? '' : '·'}
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                                <th className="px-5 py-3">Tanggal</th>
                                                <th className="px-4 py-3">Karyawan</th>
                                                <th className="px-4 py-3">Mode</th>
                                                <th className="px-4 py-3">Jam Kerja</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-5 py-3">Catatan / Audit Trail</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {recentLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-muted/30">
                                                    <td className="px-5 py-3 font-mono text-xs">{log.date}</td>
                                                    <td className="px-4 py-3 font-medium">
                                                        {log.user_name}{' '}
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            ({log.employee_code})
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs capitalize">
                                                        {log.mode === 'wfh'
                                                            ? 'WFH (Remote)'
                                                            : log.mode.replace('_', ' ')}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs">
                                                        {log.check_in_time ?? '—'} s/d {log.check_out_time ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium capitalize text-accent-foreground">
                                                            {log.status.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-xs text-muted-foreground">
                                                        {log.notes || '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                            <th className="px-5 py-3">Tanggal & Jam</th>
                                            <th className="px-4 py-3">Karyawan</th>
                                            <th className="px-4 py-3">Proyek</th>
                                            <th className="px-4 py-3">Durasi Lembur</th>
                                            <th className="px-4 py-3">Sumber & Status</th>
                                            <th className="px-4 py-3">Uraian / Audit Trail</th>
                                            <th className="px-5 py-3 text-right">Aksi Koreksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {overtimeLogs.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={7}
                                                    className="px-5 py-10 text-center text-xs text-muted-foreground"
                                                >
                                                    Belum ada data lembur pada bulan ini. Klik tombol &ldquo;Koreksi / Input Lembur Manual&rdquo; di atas untuk menambahkan.
                                                </td>
                                            </tr>
                                        ) : (
                                            overtimeLogs.map((ot) => (
                                                <tr key={ot.id} className="hover:bg-muted/30">
                                                    <td className="px-5 py-3 font-mono text-xs">
                                                        <p className="font-medium">{ot.date}</p>
                                                        <p className="text-muted-foreground">
                                                            {ot.start_time} – {ot.end_time} WIB
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">
                                                        {ot.user_name}{' '}
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            ({ot.employee_code})
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-medium text-primary">
                                                        {ot.project_name}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                                                        {Math.round((ot.duration_minutes / 60) * 10) / 10} jam ({ot.duration_minutes} mnt)
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className={cn(
                                                                    'rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
                                                                    ot.status === 'approved'
                                                                        ? 'bg-success/15 text-success'
                                                                        : ot.status === 'rejected'
                                                                        ? 'bg-destructive/15 text-destructive'
                                                                        : 'bg-warning/20 text-amber-800',
                                                                )}
                                                            >
                                                                {ot.status}
                                                            </span>
                                                            <span className="rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground capitalize">
                                                                {ot.source}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                                        {ot.task_description}
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => openOvertimeAdjust(ot.user_id, ot)}
                                                            className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted"
                                                        >
                                                            <PencilLine className="size-3" />
                                                            Edit / Koreksi
                                                        </button>
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

                {/* Detail Popover Modal when clicking a Calendar Cell */}
                {selectedCell && (
                    <div
                        onClick={() => setSelectedCell(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl"
                        >
                            <div className="flex items-start justify-between border-b px-5 py-4">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {selectedCell.dayLabel}
                                    </p>
                                    <h3 className="mt-0.5 text-base font-bold text-foreground">
                                        {selectedCell.employee.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedCell.employee.employee_code} ·{' '}
                                        {selectedCell.employee.position}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCell(null)}
                                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            <div className="space-y-3.5 px-5 py-4 text-xs">
                                {selectedCell.log ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3">
                                            <div>
                                                <p className="text-[11px] text-muted-foreground">Mode Kerja</p>
                                                <p className="mt-0.5 font-semibold capitalize text-foreground">
                                                    {selectedCell.log.mode === 'wfh'
                                                        ? 'WFH (Disetujui)'
                                                        : selectedCell.log.mode === 'site_visit'
                                                          ? 'Site Visit Lapangan'
                                                          : 'Kantor Studio'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-muted-foreground">Status</p>
                                                <span
                                                    className={cn(
                                                        'mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                                                        getCellBadge(selectedCell.log).cls,
                                                    )}
                                                >
                                                    {getCellBadge(selectedCell.log).label}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-muted-foreground">Jam Masuk</p>
                                                <p className="mt-0.5 font-mono font-semibold text-foreground">
                                                    {selectedCell.log.check_in_time ?? '—'} WIB
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-muted-foreground">Jam Pulang</p>
                                                <p className="mt-0.5 font-mono font-semibold text-foreground">
                                                    {selectedCell.log.check_out_time ?? 'Belum check-out'}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedCell.log.site_visit_project_name && (
                                            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-amber-950">
                                                <p className="text-[10px] font-semibold uppercase text-amber-800">
                                                    Lokasi Proyek Site Visit
                                                </p>
                                                <p className="mt-0.5 font-semibold">
                                                    {selectedCell.log.site_visit_project_name}
                                                </p>
                                            </div>
                                        )}

                                        {selectedCell.log.shortage_minutes > 0 && (
                                            <p className="rounded-lg bg-orange-50 px-3 py-2 font-medium text-orange-800">
                                                Kekurangan jam kerja: {selectedCell.log.shortage_minutes} menit
                                            </p>
                                        )}

                                        <div>
                                            <p className="text-[11px] font-medium text-muted-foreground">
                                                Catatan / Audit Trail
                                            </p>
                                            <p className="mt-1 rounded-lg border bg-background p-2.5 text-foreground">
                                                {selectedCell.log.notes || 'Tidak ada catatan tambahan.'}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-muted-foreground">
                                        Belum ada data presensi tercatat pada tanggal ini.
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const cell = selectedCell;
                                        setSelectedCell(null);
                                        openAttendanceAdjust(
                                            cell.employee.user_id,
                                            cell.dateStr,
                                            cell.log,
                                        );
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                                >
                                    <PencilLine className="size-3.5" />
                                    {selectedCell.log
                                        ? 'Koreksi Absen Tanggal Ini'
                                        : 'Input Absen / Izin Manual'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCell(null)}
                                    className="rounded-lg border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Unified Modal: Koreksi Kehadiran Harian & Koreksi Data Lemburan */}
                {adjustModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-black/30 backdrop-blur-xs"
                            onClick={() => setAdjustModalOpen(false)}
                        />
                        <div className="relative z-10 w-full max-w-xl rounded-xl border bg-card shadow-xl">
                            <div className="flex items-center justify-between border-b px-6 py-4">
                                <div>
                                    <h3 className="text-base font-semibold">
                                        Koreksi & Input Manual (Absensi & Lemburan)
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Seluruh penyesuaian tercatat otomatis pada log audit studio.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAdjustModalOpen(false)}
                                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            {/* Modal Mode Switcher: Kehadiran vs Lemburan */}
                            <div className="border-b bg-muted/30 px-6 py-2.5">
                                <div className="grid grid-cols-2 gap-1 rounded-lg border bg-background p-1">
                                    <button
                                        type="button"
                                        onClick={() => setAdjustTab('attendance')}
                                        className={cn(
                                            'inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors',
                                            adjustTab === 'attendance'
                                                ? 'bg-foreground text-background shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        <PencilLine className="size-3.5" />
                                        1. Koreksi Absensi Harian
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdjustTab('overtime')}
                                        className={cn(
                                            'inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors',
                                            adjustTab === 'overtime'
                                                ? 'bg-foreground text-background shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        <Timer className="size-3.5" />
                                        2. Koreksi / Input Data Lemburan
                                    </button>
                                </div>
                            </div>

                            {adjustTab === 'attendance' ? (
                                <form onSubmit={handleAttendanceAdjustSubmit} className="space-y-4 p-6">
                                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Pilih Karyawan *
                                            </label>
                                            <select
                                                value={adjustForm.data.user_id}
                                                onChange={(e) =>
                                                    adjustForm.setData('user_id', Number(e.target.value))
                                                }
                                                className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none"
                                            >
                                                {employees.map((emp) => (
                                                    <option key={emp.id} value={emp.id}>
                                                        {emp.name} ({emp.employee_code})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Tanggal Kehadiran *
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={adjustForm.data.date}
                                                onChange={(e) => adjustForm.setData('date', e.target.value)}
                                                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Mode Kehadiran *
                                            </label>
                                            <select
                                                value={adjustForm.data.mode}
                                                onChange={(e) =>
                                                    adjustForm.setData(
                                                        'mode',
                                                        e.target.value as 'office' | 'site_visit' | 'wfh',
                                                    )
                                                }
                                                className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none"
                                            >
                                                <option value="office">Kantor Studio</option>
                                                <option value="wfh">WFH (Work From Home)</option>
                                                <option value="site_visit">Site Visit Lapangan</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Status Kehadiran *
                                            </label>
                                            <select
                                                value={adjustForm.data.status}
                                                onChange={(e) =>
                                                    adjustForm.setData('status', e.target.value as any)
                                                }
                                                className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none"
                                            >
                                                <option value="hadir">Hadir Penuh (9 Jam)</option>
                                                <option value="kurang_jam">Kurang Jam Kerja</option>
                                                <option value="site_visit">Site Visit</option>
                                                <option value="izin">Izin</option>
                                                <option value="cuti">Cuti Tahunan</option>
                                                <option value="sakit">Sakit</option>
                                                <option value="ganti_hari">Libur Ganti Hari (Auto-Lock)</option>
                                                <option value="alpha">Alpha</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Jam Masuk (WIB)
                                            </label>
                                            <input
                                                type="time"
                                                value={adjustForm.data.check_in_time}
                                                onChange={(e) =>
                                                    adjustForm.setData('check_in_time', e.target.value)
                                                }
                                                className="h-9 w-full rounded-lg border bg-background px-3 font-mono text-sm outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Jam Pulang (WIB)
                                            </label>
                                            <input
                                                type="time"
                                                value={adjustForm.data.check_out_time}
                                                onChange={(e) =>
                                                    adjustForm.setData('check_out_time', e.target.value)
                                                }
                                                className="h-9 w-full rounded-lg border bg-background px-3 font-mono text-sm outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Optional Quick Overtime Addition */}
                                    <div className="rounded-lg border bg-muted/30 p-3">
                                        <p className="mb-2 text-xs font-medium text-foreground">
                                            Tambahan Lembur di Hari yang Sama (Opsional)
                                        </p>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-[11px] text-muted-foreground">
                                                    Durasi Lembur (Menit)
                                                </label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={15}
                                                    value={adjustForm.data.overtime_minutes}
                                                    onChange={(e) =>
                                                        adjustForm.setData(
                                                            'overtime_minutes',
                                                            Number(e.target.value),
                                                        )
                                                    }
                                                    placeholder="0 (Contoh: 120 untuk 2 jam)"
                                                    className="h-8 w-full rounded-lg border bg-card px-2.5 font-mono text-xs outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[11px] text-muted-foreground">
                                                    Proyek Lembur
                                                </label>
                                                <select
                                                    value={adjustForm.data.overtime_project_id}
                                                    onChange={(e) =>
                                                        adjustForm.setData(
                                                            'overtime_project_id',
                                                            Number(e.target.value),
                                                        )
                                                    }
                                                    className="h-8 w-full rounded-lg border bg-card px-2 text-xs outline-none"
                                                >
                                                    {projects.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium">
                                            Catatan Alasan Koreksi (Audit Trail) *
                                        </label>
                                        <textarea
                                            rows={2}
                                            required
                                            value={adjustForm.data.notes}
                                            onChange={(e) => adjustForm.setData('notes', e.target.value)}
                                            placeholder="Contoh: Lupa check-out karena rapat klien di lokasi proyek"
                                            className="w-full rounded-lg border bg-background p-2.5 text-sm outline-none"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 border-t pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setAdjustModalOpen(false)}
                                            className="h-9 rounded-lg border bg-card px-4 text-xs font-medium hover:bg-muted"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={adjustForm.processing}
                                            className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                        >
                                            Simpan Koreksi Absen
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleOvertimeAdjustSubmit} className="space-y-4 p-6">
                                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Pilih Karyawan *
                                            </label>
                                            <select
                                                value={overtimeAdjustForm.data.user_id}
                                                onChange={(e) =>
                                                    overtimeAdjustForm.setData(
                                                        'user_id',
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none"
                                            >
                                                {employees.map((emp) => (
                                                    <option key={emp.id} value={emp.id}>
                                                        {emp.name} ({emp.employee_code})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Tanggal Lembur *
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={overtimeAdjustForm.data.date}
                                                onChange={(e) =>
                                                    overtimeAdjustForm.setData('date', e.target.value)
                                                }
                                                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Proyek yang Dilemburkan *
                                            </label>
                                            <select
                                                value={overtimeAdjustForm.data.project_id}
                                                onChange={(e) =>
                                                    overtimeAdjustForm.setData(
                                                        'project_id',
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none"
                                            >
                                                {projects.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Jam Mulai Lembur (WIB)
                                            </label>
                                            <input
                                                type="time"
                                                value={overtimeAdjustForm.data.start_time}
                                                onChange={(e) =>
                                                    overtimeAdjustForm.setData(
                                                        'start_time',
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-9 w-full rounded-lg border bg-background px-3 font-mono text-sm outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Durasi Lembur (Menit) *
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min={15}
                                                    max={960}
                                                    step={15}
                                                    required
                                                    value={overtimeAdjustForm.data.duration_minutes}
                                                    onChange={(e) =>
                                                        overtimeAdjustForm.setData(
                                                            'duration_minutes',
                                                            Number(e.target.value),
                                                        )
                                                    }
                                                    className="h-9 w-full rounded-lg border bg-background px-3 font-mono text-sm outline-none"
                                                />
                                                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                                    = {Math.round((overtimeAdjustForm.data.duration_minutes / 60) * 10) / 10} jam
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Status Approval Lembur *
                                            </label>
                                            <select
                                                value={overtimeAdjustForm.data.status}
                                                onChange={(e) =>
                                                    overtimeAdjustForm.setData(
                                                        'status',
                                                        e.target.value as 'approved' | 'pending' | 'rejected',
                                                    )
                                                }
                                                className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none"
                                            >
                                                <option value="approved">Approved (Masuk Payroll)</option>
                                                <option value="pending">Pending</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium">
                                            Uraian Tugas Lembur & Catatan Koreksi Admin *
                                        </label>
                                        <textarea
                                            rows={2}
                                            required
                                            value={overtimeAdjustForm.data.task_description}
                                            onChange={(e) =>
                                                overtimeAdjustForm.setData(
                                                    'task_description',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Contoh: Lembur penyelesaian DED & 3D render untuk asistensi klien"
                                            className="w-full rounded-lg border bg-background p-2.5 text-sm outline-none"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 border-t pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setAdjustModalOpen(false)}
                                            className="h-9 rounded-lg border bg-card px-4 text-xs font-medium hover:bg-muted"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={overtimeAdjustForm.processing}
                                            className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                        >
                                            {overtimeAdjustForm.data.overtime_id
                                                ? 'Simpan Koreksi Lembur'
                                                : 'Simpan Data Lembur Manual'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </AppShell>
        </>
    );
}
