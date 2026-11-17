import * as React from 'react';
import { useEffect, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    CalendarClock,
    CalendarDays,
    Camera,
    CheckCircle2,
    Clock,
    FileText,
    HardHat,
    Lock,
    LogIn,
    LogOut,
    MapPin,
    Navigation,
    Plus,
    Sparkles,
    Timer,
    X,
} from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';

type AttendanceItem = {
    id: number;
    user_id: number;
    date: string;
    mode: 'office' | 'site_visit';
    is_weekend: boolean;
    compensation_type: 'none' | 'overtime' | 'day_off_exchange';
    exchange_date?: string | null;
    compensation_status: 'none' | 'pending' | 'approved' | 'rejected';
    check_in_at?: string | null;
    check_out_at?: string | null;
    check_in_time?: string | null;
    check_out_time?: string | null;
    check_in_distance_meters?: number | null;
    target_work_minutes: number;
    actual_work_minutes?: number | null;
    elapsed_seconds?: number;
    cooldown_remaining_seconds?: number;
    shortage_minutes: number;
    status: 'hadir' | 'kurang_jam' | 'izin' | 'sakit' | 'cuti' | 'alpha' | 'site_visit' | 'ganti_hari';
    site_visit_project_id?: number | null;
    site_visit_project_name?: string | null;
    site_visit_photo_url?: string | null;
    site_visit_status: 'none' | 'pending' | 'approved' | 'rejected';
    notes?: string | null;
};

type ActiveOvertime = {
    id: number;
    project_id: number;
    project_name: string;
    task_description: string;
    start_at: string;
    elapsed_seconds?: number;
    status: string;
};

type LeaveRequestItem = {
    id: number;
    type: 'izin' | 'cuti' | 'sakit';
    start_date: string;
    end_date: string;
    total_days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason?: string | null;
    created_at?: string | null;
};

type ProjectOption = {
    id: number;
    name: string;
    location?: string | null;
    client_name?: string | null;
};

type OfficeSetting = {
    office_name: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    standard_work_hours: number;
    overtime_cooldown_minutes: number;
};

interface Props {
    todayAttendance: AttendanceItem | null;
    activeOvertime: ActiveOvertime | null;
    history: AttendanceItem[];
    leaveRequests: LeaveRequestItem[];
    leaveQuota: {
        annual_quota: number;
        used_days: number;
        remaining_days: number;
    };
    projects: ProjectOption[];
    officeSetting: OfficeSetting;
    isWeekendToday: boolean;
    todayDate: string;
}

const statusChip: Record<string, { label: string; className: string }> = {
    hadir: { label: 'Hadir Penuh', className: 'bg-success/15 text-success' },
    kurang_jam: { label: 'Kurang Jam', className: 'bg-warning/20 text-amber-800' },
    site_visit: { label: 'Site Visit', className: 'bg-accent text-accent-foreground' },
    izin: { label: 'Izin', className: 'bg-stone-100 text-stone-700' },
    cuti: { label: 'Cuti Tahunan', className: 'bg-blue-50 text-blue-800' },
    sakit: { label: 'Sakit', className: 'bg-rose-50 text-rose-800' },
    ganti_hari: { label: 'Libur Ganti Hari (Locked)', className: 'bg-purple-50 text-purple-800' },
    alpha: { label: 'Alpha', className: 'bg-destructive/15 text-destructive' },
};

function formatMinutes(mins?: number | null) {
    if (mins === undefined || mins === null) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}j ${String(m).padStart(2, '0')}m`;
}

function formatSecondsLive(totalSeconds: number) {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return `${h}j ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}d`;
}

export default function AttendanceIndex({
    todayAttendance,
    activeOvertime,
    history,
    leaveRequests,
    leaveQuota,
    projects,
    officeSetting,
    isWeekendToday,
    todayDate,
}: Props) {
    const { auth, flash } = usePage<PageProps>().props;
    const initialRole = auth?.user?.role === 'admin' ? 'admin' : 'karyawan';
    const activeMenu = initialRole === 'admin' ? 'presensi-saya' : 'presensi-harian';

    const [activeTab, setActiveTab] = useState<'history' | 'leave'>('history');
    const [mode, setMode] = useState<'office' | 'site_visit'>(todayAttendance?.mode ?? 'office');
    const [siteProjectId, setSiteProjectId] = useState<string>(
        String(todayAttendance?.site_visit_project_id ?? projects[0]?.id ?? ''),
    );
    const [notes, setNotes] = useState<string>(todayAttendance?.notes ?? '');
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Weekend mode simulation or actual weekend
    const [weekendSim, setWeekendSim] = useState<boolean>(isWeekendToday);
    const [compensationType, setCompensationType] = useState<'overtime' | 'day_off_exchange'>('overtime');
    const [exchangeDate, setExchangeDate] = useState<string>('');

    // Early checkout warning modal
    const [earlyCheckoutModal, setEarlyCheckoutModal] = useState(false);

    const isLockedDay =
        !!todayAttendance &&
        ['ganti_hari', 'izin', 'cuti', 'sakit'].includes(todayAttendance.status);
    const isWorking = !!todayAttendance?.check_in_at && !todayAttendance?.check_out_at;
    const hasCheckedOut = !!todayAttendance?.check_out_at;

    const [workSeconds, setWorkSeconds] = useState<number>(todayAttendance?.elapsed_seconds ?? 0);
    const [cooldownSeconds, setCooldownSeconds] = useState<number>(
        todayAttendance?.cooldown_remaining_seconds ?? 3600,
    );
    const [overtimeSeconds, setOvertimeSeconds] = useState<number>(activeOvertime?.elapsed_seconds ?? 0);

    // Sync workSeconds & cooldownSeconds when server props change (e.g. after Check-in / Check-out)
    useEffect(() => {
        setWorkSeconds(todayAttendance?.elapsed_seconds ?? 0);
        setCooldownSeconds(todayAttendance?.cooldown_remaining_seconds ?? 3600);
    }, [
        todayAttendance?.id,
        todayAttendance?.check_in_at,
        todayAttendance?.check_out_at,
        todayAttendance?.elapsed_seconds,
        todayAttendance?.cooldown_remaining_seconds,
    ]);

    useEffect(() => {
        setOvertimeSeconds(activeOvertime?.elapsed_seconds ?? 0);
    }, [activeOvertime?.id, activeOvertime?.start_at, activeOvertime?.elapsed_seconds]);

    // Tick every second while working, in post-checkout cooldown, or while overtime is active
    useEffect(() => {
        if (!isWorking && !hasCheckedOut && !activeOvertime) return;
        const id = window.setInterval(() => {
            if (isWorking) {
                setWorkSeconds((prev) => prev + 1);
            }
            if (hasCheckedOut) {
                setCooldownSeconds((prev) => Math.max(0, prev - 1));
            }
            if (activeOvertime) {
                setOvertimeSeconds((prev) => prev + 1);
            }
        }, 1000);
        return () => window.clearInterval(id);
    }, [isWorking, hasCheckedOut, activeOvertime]);

    const canStartOvertime = hasCheckedOut && cooldownSeconds === 0;

    const checkInDate = todayAttendance?.check_in_at ? new Date(todayAttendance.check_in_at) : null;

    const elapsedMinutes = todayAttendance?.actual_work_minutes ?? Math.floor(workSeconds / 60);
    const targetMinutes = todayAttendance?.target_work_minutes ?? officeSetting.standard_work_hours * 60;
    const progressPercent = Math.min(100, Math.round((workSeconds / (targetMinutes * 60)) * 100));
    const targetEndDate = checkInDate ? new Date(checkInDate.getTime() + targetMinutes * 60000) : null;

    // Overtime form
    const overtimeForm = useForm({
        project_id: projects[0]?.id ?? '',
        task_description: '',
    });

    // Leave request form
    const leaveForm = useForm({
        type: 'cuti' as 'izin' | 'cuti' | 'sakit',
        start_date: todayDate,
        end_date: todayDate,
        reason: '',
    });

    const handleCheckIn = () => {
        router.post(
            route('attendance.check-in'),
            {
                mode,
                distance_meters: 45,
                site_visit_project_id: mode === 'site_visit' ? Number(siteProjectId) : null,
                notes,
                compensation_type: weekendSim ? compensationType : 'none',
                exchange_date: weekendSim && compensationType === 'day_off_exchange' ? exchangeDate : null,
            },
            { preserveScroll: true },
        );
    };

    const handleCheckOutClick = () => {
        if (elapsedMinutes < targetMinutes && !todayAttendance?.is_weekend) {
            setEarlyCheckoutModal(true);
            return;
        }
        confirmCheckOut(elapsedMinutes);
    };

    const confirmCheckOut = (simulatedMinutes?: number) => {
        setEarlyCheckoutModal(false);
        router.post(
            route('attendance.check-out'),
            {
                simulated_minutes: simulatedMinutes ?? elapsedMinutes,
            },
            { preserveScroll: true },
        );
    };

    const handleStartOvertime = (e: React.FormEvent) => {
        e.preventDefault();
        overtimeForm.post(route('attendance.overtime.start'), {
            preserveScroll: true,
            onSuccess: () => overtimeForm.reset('task_description'),
        });
    };

    const handleStopOvertime = (id: number) => {
        router.post(route('attendance.overtime.stop', id), {}, { preserveScroll: true });
    };

    const handleLeaveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        leaveForm.post(route('attendance.leave.store'), {
            preserveScroll: true,
            onSuccess: () => leaveForm.reset('reason'),
        });
    };

    return (
        <>
            <Head title="Presensi Harian & Lembur — RIM Studio Arsitektur" />
            <AppShell initialRole={initialRole} initialActive={activeMenu}>
                <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                    {/* Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                Kehadiran Fleksibel 9 Jam · Geofencing & Site Visit
                            </p>
                            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                                {initialRole === 'admin' ? 'Presensi Saya' : 'Presensi Harian'}
                            </h1>
                        </div>

                        {/* Weekend Policy Toggle (For testing/weekend check-in) */}
                        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs">
                            <CalendarClock className="size-4 text-primary" />
                            <span className="text-muted-foreground">Mode Hari Kerja:</span>
                            <button
                                type="button"
                                onClick={() => setWeekendSim(!weekendSim)}
                                className={cn(
                                    'rounded-md px-2 py-0.5 font-medium transition-colors',
                                    weekendSim
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-secondary text-secondary-foreground',
                                )}
                            >
                                {weekendSim ? 'Akhir Pekan (Sabtu/Minggu)' : 'Reguler (Senin–Jumat)'}
                            </button>
                        </div>
                    </div>

                    {/* Flash Feedback */}
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

                    {/* Top Grid: Main Attendance Card + Overtime Card */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Left 2 Columns: Adaptive Check-In / Check-Out Panel */}
                        <section className="flex flex-col rounded-xl border bg-card lg:col-span-2">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                                <div>
                                    <h2 className="text-sm font-semibold">Status Kehadiran Hari Ini</h2>
                                    <p className="text-xs text-muted-foreground">
                                        Target kerja {officeSetting.standard_work_hours} jam ({targetMinutes} menit) · Radius kantor {officeSetting.radius_meters}m
                                    </p>
                                </div>

                                {!isLockedDay && (
                                    <div
                                        role="radiogroup"
                                        aria-label="Mode presensi"
                                        className="flex shrink-0 rounded-lg border bg-muted/50 p-0.5"
                                    >
                                        <button
                                            type="button"
                                            disabled={isWorking}
                                            onClick={() => setMode('office')}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                                                mode === 'office'
                                                    ? 'bg-card text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            <Building2 className="size-3.5" />
                                            Kantor Studio
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isWorking}
                                            onClick={() => setMode('site_visit')}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                                                mode === 'site_visit'
                                                    ? 'bg-card text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            <HardHat className="size-3.5" />
                                            Site Visit Lapangan
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-1 flex-col gap-4 p-5">
                                {/* State 5: Auto-Locked (Ganti Hari / Izin / Cuti / Sakit) */}
                                {isLockedDay ? (
                                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/40 bg-accent/30 px-6 py-10 text-center">
                                        <span className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-primary">
                                            <Lock className="size-5" />
                                        </span>
                                        <div>
                                            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary uppercase">
                                                Status: {todayAttendance?.status.replace('_', ' ')}
                                            </span>
                                            <h3 className="mt-2 text-base font-semibold">
                                                Tombol Presensi Terkunci Otomatis Hari Ini
                                            </h3>
                                            <p className="mt-1 max-w-md text-xs text-muted-foreground">
                                                {todayAttendance?.notes ||
                                                    'Anda tercatat sedang menjalani hari libur pengganti (Ganti Hari) atau izin/cuti yang telah disetujui Admin. Hari ini tidak dihitung Alpha dan tidak memotong gaji.'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Weekend Compensation Selector (If Saturday/Sunday) */}
                                        {weekendSim && !isWorking && !hasCheckedOut && (
                                            <div className="rounded-xl border border-amber-300/80 bg-amber-50/70 p-4">
                                                <div className="flex items-start gap-2.5">
                                                    <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-700" />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-semibold text-amber-950">
                                                            Presensi Akhir Pekan (Sabtu / Minggu) Terdeteksi
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-amber-800">
                                                            Hari kerja resmi studio adalah Senin–Jumat. Pilih kompensasi kehadiran akhir pekan Anda:
                                                        </p>
                                                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setCompensationType('overtime')}
                                                                className={cn(
                                                                    'flex flex-col items-start rounded-lg border p-3 text-left transition-colors',
                                                                    compensationType === 'overtime'
                                                                        ? 'border-amber-700 bg-white shadow-xs'
                                                                        : 'border-amber-200/80 bg-amber-50/40 text-amber-900',
                                                                )}
                                                            >
                                                                <span className="text-xs font-semibold">
                                                                    1. Uang Lembur Akhir Pekan
                                                                </span>
                                                                <span className="mt-0.5 text-[11px] text-muted-foreground">
                                                                    Seluruh jam kerja hari ini dikonversi menjadi jam lembur pada payroll.
                                                                </span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => setCompensationType('day_off_exchange')}
                                                                className={cn(
                                                                    'flex flex-col items-start rounded-lg border p-3 text-left transition-colors',
                                                                    compensationType === 'day_off_exchange'
                                                                        ? 'border-amber-700 bg-white shadow-xs'
                                                                        : 'border-amber-200/80 bg-amber-50/40 text-amber-900',
                                                                )}
                                                            >
                                                                <span className="text-xs font-semibold">
                                                                    2. Ganti Hari Libur (Auto-Lock)
                                                                </span>
                                                                <span className="mt-0.5 text-[11px] text-muted-foreground">
                                                                    Pilih 1 hari kerja (Senin–Jumat) untuk dikunci otomatis sebagai libur pengganti.
                                                                </span>
                                                            </button>
                                                        </div>

                                                        {compensationType === 'day_off_exchange' && (
                                                            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                                                                <label className="text-xs font-medium text-amber-950">
                                                                    Pilih Tanggal Libur Pengganti (Senin–Jumat):
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    required
                                                                    min={todayDate}
                                                                    value={exchangeDate}
                                                                    onChange={(e) => setExchangeDate(e.target.value)}
                                                                    className="h-8 rounded-lg border border-amber-300 bg-white px-2.5 text-xs outline-none"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Mode Specific Box: Office GPS vs Site Visit */}
                                        {mode === 'office' ? (
                                            <div className="flex items-start gap-3 rounded-lg border border-success/25 bg-success/5 p-3.5">
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
                                                    <Navigation className="size-4" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-medium">
                                                            Validasi GPS Kantor: Dalam Radius
                                                        </p>
                                                        <span className="font-mono text-xs font-semibold text-success">
                                                            {todayAttendance?.check_in_distance_meters ?? 45}m / {officeSetting.radius_meters}m
                                                        </span>
                                                    </div>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {officeSetting.office_name} · Koordinat ({officeSetting.latitude}, {officeSetting.longitude})
                                                    </p>
                                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-success/15">
                                                        <div className="h-full w-[45%] rounded-full bg-success" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-xs font-medium text-muted-foreground">
                                                        Pilih Proyek Site Visit *
                                                    </label>
                                                    <select
                                                        disabled={isWorking}
                                                        value={siteProjectId}
                                                        onChange={(e) => setSiteProjectId(e.target.value)}
                                                        className="h-9 rounded-lg border bg-card px-2.5 text-sm outline-none focus-visible:border-ring"
                                                    >
                                                        {projects.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name} ({p.location || 'Lokasi Proyek'})
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <label className="mt-1 text-xs font-medium text-muted-foreground">
                                                        Uraian Kegiatan Lapangan
                                                    </label>
                                                    <input
                                                        type="text"
                                                        disabled={isWorking}
                                                        value={notes}
                                                        onChange={(e) => setNotes(e.target.value)}
                                                        placeholder="Contoh: Cek progres bekisting lantai 2"
                                                        className="h-9 rounded-lg border bg-card px-3 text-sm outline-none focus-visible:border-ring"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                                        Foto Bukti Kamera Lokasi Proyek
                                                    </label>
                                                    {photoPreview || todayAttendance?.site_visit_photo_url ? (
                                                        <div className="relative overflow-hidden rounded-lg border">
                                                            <img
                                                                src={
                                                                    photoPreview ||
                                                                    todayAttendance?.site_visit_photo_url ||
                                                                    '/projects/interior-kafe.png'
                                                                }
                                                                alt="Bukti Site Visit"
                                                                className="h-28 w-full object-cover"
                                                            />
                                                            {!isWorking && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPhotoPreview(null)}
                                                                    className="absolute top-2 right-2 rounded-md bg-background/90 p-1 text-foreground shadow-xs"
                                                                >
                                                                    <X className="size-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-card px-3 text-center transition-colors hover:border-primary/50 hover:bg-accent/30">
                                                            <Camera className="size-5 text-muted-foreground" />
                                                            <span className="text-xs font-medium">
                                                                Ambil / Unggah Foto Lokasi
                                                            </span>
                                                            <span className="text-[11px] text-muted-foreground">
                                                                Diverifikasi Admin di Pusat Approval
                                                            </span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="sr-only"
                                                                onChange={(e) => {
                                                                    const f = e.target.files?.[0];
                                                                    if (f) setPhotoPreview(URL.createObjectURL(f));
                                                                }}
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* 9-Hour Duration Progress Block */}
                                        <div className="rounded-lg bg-muted/50 p-4">
                                            <div className="flex items-end justify-between gap-3">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Durasi Kerja Hari Ini
                                                    </p>
                                                    <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
                                                        {formatSecondsLive(workSeconds)}
                                                    </p>
                                                </div>
                                                {todayAttendance ? (
                                                    <span
                                                        className={cn(
                                                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                                                            statusChip[todayAttendance.status]?.className ??
                                                                'bg-accent text-accent-foreground',
                                                        )}
                                                    >
                                                        {isWorking
                                                            ? 'Sedang Bekerja'
                                                            : statusChip[todayAttendance.status]?.label}
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                                                        Belum Check-in
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-all duration-500"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>

                                            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                                <div>
                                                    <span className="text-muted-foreground">Jam Masuk</span>
                                                    <p className="font-mono font-medium">
                                                        {todayAttendance?.check_in_time ?? '—'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Target Pulang (+9j)</span>
                                                    <p className="font-mono font-medium">
                                                        {targetEndDate
                                                            ? targetEndDate.toTimeString().slice(0, 5)
                                                            : '—'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Kekurangan Jam</span>
                                                    <p
                                                        className={cn(
                                                            'font-mono font-medium',
                                                            (todayAttendance?.shortage_minutes ?? 0) > 0 &&
                                                                'text-amber-700',
                                                        )}
                                                    >
                                                        {(todayAttendance?.shortage_minutes ?? 0) > 0
                                                            ? `-${todayAttendance?.shortage_minutes} mnt`
                                                            : '0 mnt'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            {!isWorking ? (
                                                <button
                                                    type="button"
                                                    onClick={handleCheckIn}
                                                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                                >
                                                    <LogIn className="size-4" />
                                                    {hasCheckedOut
                                                        ? 'Check-in Ulang Hari Ini'
                                                        : mode === 'office'
                                                        ? 'Check-in Kantor Sekarang'
                                                        : 'Kirim Check-in Site Visit'}
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={handleCheckOutClick}
                                                        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                                    >
                                                        <LogOut className="size-4" />
                                                        Check-out Pulang
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => confirmCheckOut(540)}
                                                        title="Simulasikan selesai kerja 9 jam penuh (540 menit)"
                                                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-success/15 px-3 text-xs font-medium text-success transition-colors hover:bg-success/25"
                                                    >
                                                        <CheckCircle2 className="size-3.5" />
                                                        Selesai 9 Jam Penuh
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>

                        {/* Right Column: Sistem Lembur Malam Otomatis */}
                        <section className="flex flex-col rounded-xl border bg-card">
                            <div className="flex items-center justify-between border-b px-5 py-4">
                                <div>
                                    <h2 className="text-sm font-semibold">Sistem Lembur Proyek</h2>
                                    <p className="text-xs text-muted-foreground">
                                        Aktif setelah jeda {officeSetting.overtime_cooldown_minutes} menit dari jam pulang
                                    </p>
                                </div>
                                <Timer className="size-4 text-primary" />
                            </div>

                            <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                                {activeOvertime ? (
                                    <div className="flex flex-col gap-4">
                                        <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-4">
                                            <div className="flex items-center justify-between">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950">
                                                    <span className="size-1.5 rounded-full bg-amber-700 animate-ping" />
                                                    Lembur Sedang Berjalan
                                                </span>
                                                <span className="font-mono text-xs text-amber-900">
                                                    {formatSecondsLive(overtimeSeconds)} · Mulai{' '}
                                                    {new Date(activeOvertime.start_at).toTimeString().slice(0, 5)} WIB
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm font-semibold text-amber-950">
                                                {activeOvertime.project_name}
                                            </p>
                                            <p className="mt-0.5 text-xs text-amber-800">
                                                {activeOvertime.task_description}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleStopOvertime(activeOvertime.id)}
                                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                                        >
                                            <CheckCircle2 className="size-4" />
                                            Selesai Lembur & Kirim Approval
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleStartOvertime} className="flex flex-1 flex-col gap-3">
                                        {!hasCheckedOut ? (
                                            <div className="rounded-lg border border-dashed bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
                                                Selesaikan jam kerja normal & lakukan <strong>Check-out</strong> terlebih dahulu. Tombol lembur akan aktif setelah jeda istirahat 1 jam.
                                            </div>
                                        ) : cooldownSeconds > 0 ? (
                                            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-300/80 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
                                                <span>
                                                    Menunggu jeda 1 jam:{' '}
                                                    <strong className="font-mono">
                                                        {Math.floor(cooldownSeconds / 60)}m{' '}
                                                        {String(cooldownSeconds % 60).padStart(2, '0')}d
                                                    </strong>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setCooldownSeconds(0)}
                                                    className="shrink-0 font-semibold text-primary hover:underline"
                                                >
                                                    Lewati Jeda (Demo)
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border border-success/30 bg-success/10 px-3.5 py-2 text-xs font-medium text-success">
                                                Jeda istirahat 1 jam selesai · Anda dapat memulai lembur sekarang.
                                            </div>
                                        )}

                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                                Proyek yang Dilemburkan *
                                            </label>
                                            <select
                                                disabled={!canStartOvertime}
                                                value={overtimeForm.data.project_id}
                                                onChange={(e) =>
                                                    overtimeForm.setData('project_id', Number(e.target.value))
                                                }
                                                className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {projects.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                                Target / Uraian Tugas Lembur *
                                            </label>
                                            <textarea
                                                rows={3}
                                                required
                                                disabled={!canStartOvertime}
                                                value={overtimeForm.data.task_description}
                                                onChange={(e) =>
                                                    overtimeForm.setData('task_description', e.target.value)
                                                }
                                                placeholder="Contoh: Revisi gambar kerja fasad & render malam untuk presentasi besok pagi…"
                                                className="w-full rounded-lg border bg-background p-2.5 text-sm outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={!canStartOvertime || overtimeForm.processing}
                                            className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Timer className="size-4" />
                                            {!hasCheckedOut
                                                ? 'Mulai Lembur Sekarang (Belum Check-out)'
                                                : cooldownSeconds > 0
                                                ? `Mulai Lembur Sekarang (Aktif dlm ${Math.floor(cooldownSeconds / 60)}m ${String(cooldownSeconds % 60).padStart(2, '0')}d)`
                                                : 'Mulai Lembur Sekarang'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Bottom Section: Tabs for Personal Attendance History & Leave Requests */}
                    <section className="flex flex-col rounded-xl border bg-card">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
                            <div role="tablist" className="flex gap-1 rounded-lg border bg-muted/50 p-1">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === 'history'}
                                    onClick={() => setActiveTab('history')}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                        activeTab === 'history'
                                            ? 'bg-card text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <CalendarDays className="size-3.5" />
                                    Riwayat Kehadiran Pribadi ({history.length})
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === 'leave'}
                                    onClick={() => setActiveTab('leave')}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                        activeTab === 'leave'
                                            ? 'bg-card text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <FileText className="size-3.5" />
                                    Pengajuan Izin, Cuti & Sakit ({leaveRequests.length})
                                </button>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Sisa Kuota Cuti Tahunan:</span>
                                <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono font-semibold text-accent-foreground">
                                    {leaveQuota.remaining_days} / {leaveQuota.annual_quota} hari
                                </span>
                            </div>
                        </div>

                        {activeTab === 'history' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                            <th className="px-5 py-3">Tanggal</th>
                                            <th className="px-4 py-3">Mode</th>
                                            <th className="px-4 py-3">Jam Masuk</th>
                                            <th className="px-4 py-3">Jam Pulang</th>
                                            <th className="px-4 py-3">Durasi Kerja</th>
                                            <th className="px-4 py-3">Kekurangan</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-5 py-3">Catatan / Proyek</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {history.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={8}
                                                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                                                >
                                                    Belum ada riwayat presensi tercatat. Silakan lakukan check-in hari ini.
                                                </td>
                                            </tr>
                                        ) : (
                                            history.map((item) => {
                                                const st = statusChip[item.status] ?? {
                                                    label: item.status,
                                                    className: 'bg-muted text-muted-foreground',
                                                };
                                                return (
                                                    <tr key={item.id} className="hover:bg-muted/30">
                                                        <td className="px-5 py-3 font-mono text-xs font-medium">
                                                            {item.date}
                                                            {item.is_weekend && (
                                                                <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-px font-sans text-[10px] text-amber-900">
                                                                    Weekend
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs">
                                                            {item.mode === 'site_visit' ? (
                                                                <span className="inline-flex items-center gap-1 font-medium text-primary">
                                                                    <HardHat className="size-3.5" />
                                                                    Site Visit
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                                    <Building2 className="size-3.5" />
                                                                    Kantor ({item.check_in_distance_meters ?? 45}m)
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-xs">
                                                            {item.check_in_time ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-xs">
                                                            {item.check_out_time ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-xs font-medium">
                                                            {formatMinutes(item.actual_work_minutes)}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-xs">
                                                            {item.shortage_minutes > 0 ? (
                                                                <span className="text-amber-700 font-medium">
                                                                    -{item.shortage_minutes} mnt
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground">0 mnt</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={cn(
                                                                    'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                                                                    st.className,
                                                                )}
                                                            >
                                                                {st.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3 text-xs text-muted-foreground">
                                                            {item.site_visit_project_name
                                                                ? `${item.site_visit_project_name} · `
                                                                : ''}
                                                            {item.notes || '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-3">
                                {/* Form Pengajuan Izin/Cuti/Sakit */}
                                <form
                                    onSubmit={handleLeaveSubmit}
                                    className="flex flex-col gap-3.5 rounded-xl border bg-background p-4"
                                >
                                    <h3 className="text-sm font-semibold">Ajukan Izin / Cuti / Sakit Baru</h3>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium">Jenis Permohonan *</label>
                                        <select
                                            value={leaveForm.data.type}
                                            onChange={(e) =>
                                                leaveForm.setData(
                                                    'type',
                                                    e.target.value as 'izin' | 'cuti' | 'sakit',
                                                )
                                            }
                                            className="h-9 w-full rounded-lg border bg-card px-2.5 text-sm outline-none"
                                        >
                                            <option value="cuti">
                                                Cuti Tahunan (Sisa {leaveQuota.remaining_days} hari)
                                            </option>
                                            <option value="izin">Izin Keperluan Pribadi</option>
                                            <option value="sakit">Sakit (Istirahat Medis)</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Tanggal Mulai *</label>
                                            <input
                                                type="date"
                                                required
                                                value={leaveForm.data.start_date}
                                                onChange={(e) =>
                                                    leaveForm.setData('start_date', e.target.value)
                                                }
                                                className="h-9 w-full rounded-lg border bg-card px-2.5 text-xs outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Tanggal Selesai *</label>
                                            <input
                                                type="date"
                                                required
                                                min={leaveForm.data.start_date}
                                                value={leaveForm.data.end_date}
                                                onChange={(e) =>
                                                    leaveForm.setData('end_date', e.target.value)
                                                }
                                                className="h-9 w-full rounded-lg border bg-card px-2.5 text-xs outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium">Keterangan / Alasan *</label>
                                        <textarea
                                            rows={3}
                                            required
                                            value={leaveForm.data.reason}
                                            onChange={(e) => leaveForm.setData('reason', e.target.value)}
                                            placeholder="Tuliskan alasan permohonan izin/cuti…"
                                            className="w-full rounded-lg border bg-card p-2.5 text-sm outline-none"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={leaveForm.processing}
                                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                    >
                                        <Plus className="size-3.5" />
                                        Kirim Permohonan
                                    </button>
                                </form>

                                {/* Tabel Riwayat Pengajuan */}
                                <div className="overflow-x-auto lg:col-span-2">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                                <th className="px-4 py-2.5">Jenis</th>
                                                <th className="px-4 py-2.5">Rentang Tanggal</th>
                                                <th className="px-4 py-2.5">Durasi</th>
                                                <th className="px-4 py-2.5">Alasan</th>
                                                <th className="px-4 py-2.5">Status Approval</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {leaveRequests.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="px-4 py-10 text-center text-xs text-muted-foreground"
                                                    >
                                                        Belum ada riwayat permohonan izin atau cuti.
                                                    </td>
                                                </tr>
                                            ) : (
                                                leaveRequests.map((lr) => (
                                                    <tr key={lr.id} className="hover:bg-muted/30">
                                                        <td className="px-4 py-3 font-medium capitalize">
                                                            {lr.type}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-xs">
                                                            {lr.start_date} s/d {lr.end_date}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs">
                                                            {lr.total_days} hari kerja
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                                            {lr.reason}
                                                        </td>
                                                        <td className="px-4 py-3">
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
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* Modal Peringatan Checkout Dini (< 9 Jam) */}
                {earlyCheckoutModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-black/30 backdrop-blur-xs"
                            onClick={() => setEarlyCheckoutModal(false)}
                        />
                        <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
                            <div className="flex items-start gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/20 text-amber-800">
                                    <AlertTriangle className="size-5" />
                                </span>
                                <div>
                                    <h3 className="text-base font-semibold">
                                        Durasi Kerja Belum Mencapai 9 Jam
                                    </h3>
                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                        Anda baru bekerja selama{' '}
                                        <strong className="text-foreground">
                                            {formatMinutes(elapsedMinutes)}
                                        </strong>{' '}
                                        dari target 9 jam (540 menit). Checkout sekarang akan mencatat kekurangan{' '}
                                        <strong className="text-amber-700">
                                            {Math.max(0, targetMinutes - elapsedMinutes)} menit
                                        </strong>{' '}
                                        dengan status <code className="font-mono">kurang_jam</code>.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEarlyCheckoutModal(false)}
                                    className="h-9 rounded-lg border bg-card px-3.5 text-xs font-medium hover:bg-muted"
                                >
                                    Batal (Lanjut Kerja)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => confirmCheckOut(elapsedMinutes)}
                                    className="h-9 rounded-lg bg-amber-600 px-3.5 text-xs font-medium text-white hover:bg-amber-700"
                                >
                                    Tetap Check-out (Catat Kurang Jam)
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AppShell>
        </>
    );
}
