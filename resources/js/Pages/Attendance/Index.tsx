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
    RefreshCw,
    Sparkles,
    Timer,
    Upload,
    X,
} from 'lucide-react';
import { CameraCaptureModal } from '@/Components/CameraCaptureModal';
import { AppShell } from '@/Components/dashboard/app-shell';
import { useOfficeGps } from '@/lib/geolocation';
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
    is_auto_closed?: boolean;
    adjustment_type?: 'none' | 'check_in' | 'check_out' | 'full_day';
    adjustment_status?: 'none' | 'pending' | 'approved' | 'rejected';
    adjusted_check_in_time?: string | null;
    adjusted_check_out_time?: string | null;
    adjustment_reason?: string | null;
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
    project_type?: 'perencanaan' | 'pembangunan' | 'desain_bangun';
    group?: 'lapangan' | 'perencanaan';
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
    unclosedPastAttendance?: AttendanceItem | null;
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
    canSimulateWeekend?: boolean;
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
    unclosedPastAttendance,
    activeOvertime,
    history,
    leaveRequests,
    leaveQuota,
    projects,
    officeSetting,
    isWeekendToday,
    canSimulateWeekend = false,
    todayDate,
}: Props) {
    const { auth, flash, siteVisitProjects = [] } = usePage<PageProps>().props;
    const isFieldWorker = auth?.workType === 'lapangan';
    const fieldSiteProjects = siteVisitProjects.filter((p) => p.group === 'lapangan');
    const planningSiteProjects = siteVisitProjects.filter((p) => p.group === 'perencanaan');
    const isSuperAdmin = auth?.user?.role === 'super_admin';
    const isAdmin = isSuperAdmin || auth?.user?.role === 'admin';
    const initialRole = isAdmin ? 'admin' : 'karyawan';
    const activeMenu = isSuperAdmin ? 'presensi-saya' : 'presensi-harian';

    const [activeTab, setActiveTab] = useState<'history' | 'leave'>('history');
    const [mode, setMode] = useState<'office' | 'site_visit'>(
        todayAttendance?.mode ?? (isFieldWorker ? 'site_visit' : 'office'),
    );
    const [siteProjectId, setSiteProjectId] = useState<string>(
        String(todayAttendance?.site_visit_project_id ?? siteVisitProjects[0]?.id ?? ''),
    );
    const [notes, setNotes] = useState<string>(todayAttendance?.notes ?? '');
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraTarget, setCameraTarget] = useState<'checkin' | 'checkout'>('checkin');

    // Site Visit Check-out Modal (for office check-in employees who went on mid-day site visit)
    const [siteVisitCheckoutModal, setSiteVisitCheckoutModal] = useState(false);
    const [checkoutSiteProjectId, setCheckoutSiteProjectId] = useState<string>(
        String(siteVisitProjects[0]?.id ?? ''),
    );
    const [checkoutPhotoFile, setCheckoutPhotoFile] = useState<File | null>(null);
    const [checkoutPhotoPreview, setCheckoutPhotoPreview] = useState<string | null>(null);
    const [checkoutNotes, setCheckoutNotes] = useState<string>('');
    const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    // Compensation state when today is an official weekly off-day (or simulated in local env)
    const [weekendSim, setWeekendSim] = useState<boolean>(isWeekendToday);
    const effectiveIsWeekend = canSimulateWeekend ? weekendSim : isWeekendToday;
    const [compensationType, setCompensationType] = useState<'overtime' | 'day_off_exchange'>('overtime');
    const [exchangeDate, setExchangeDate] = useState<string>('');

    const [gpsSimMode, setGpsSimMode] = useState<'real' | 'inside' | 'outside'>('real');
    const rawGps = useOfficeGps(
        Number(officeSetting.latitude),
        Number(officeSetting.longitude),
        officeSetting.radius_meters,
    );
    const gps =
        canSimulateWeekend && gpsSimMode === 'inside'
            ? {
                  ...rawGps,
                  status: 'ready' as const,
                  latitude: Number(officeSetting.latitude),
                  longitude: Number(officeSetting.longitude),
                  distanceMeters: 15,
                  isWithinRadius: true,
                  errorMessage: null,
              }
            : canSimulateWeekend && gpsSimMode === 'outside'
            ? {
                  ...rawGps,
                  status: 'ready' as const,
                  latitude: Number(officeSetting.latitude) + 0.015,
                  longitude: Number(officeSetting.longitude),
                  distanceMeters: 1668,
                  isWithinRadius: false,
                  errorMessage: null,
              }
            : rawGps;

    // Early checkout warning modal
    const [earlyCheckoutModal, setEarlyCheckoutModal] = useState(false);

    // Case 1 & 2: Attendance Adjustment Modal (Lupa Absen Masuk / Pulang / Seharian)
    const [adjustmentModal, setAdjustmentModal] = useState(false);

    // Case 3: Unclosed Past Attendance Confirm Checkout Modal
    const [confirmCheckoutModal, setConfirmCheckoutModal] = useState(
        typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).get('confirm_checkout') === '1',
    );

    // Case 4: Split Check-Out & Direct Overtime Modal
    const [splitOvertimeModal, setSplitOvertimeModal] = useState(false);

    const todayOvertime = auth?.todayOvertime ?? null;
    const hasLeaveToday = auth?.hasLeaveToday ?? false;
    const isLockedDay =
        (!!todayAttendance &&
            ['ganti_hari', 'izin', 'cuti', 'sakit'].includes(todayAttendance.status)) ||
        hasLeaveToday;
    const hasCompletedOvertimeToday =
        !!todayOvertime && todayOvertime.status !== 'active';
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

    const isSiteVisitToday = todayAttendance?.mode === 'site_visit';
    const isOfficeGpsBlockedForOvertime = !isSiteVisitToday && !gps.isWithinRadius;
    const canStartOvertime =
        !isLockedDay &&
        !hasCompletedOvertimeToday &&
        hasCheckedOut &&
        cooldownSeconds === 0 &&
        !isOfficeGpsBlockedForOvertime;

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

    // Case 1 & 2: Attendance Adjustment Form (Lupa Absen Masuk / Pulang / Seharian)
    const adjustmentForm = useForm({
        adjustment_type: 'check_in' as 'check_in' | 'check_out' | 'full_day',
        date: todayDate,
        adjusted_check_in_time: '08:00',
        adjusted_check_out_time: isFieldWorker ? '16:00' : '17:00',
        notes: '',
    });

    // Case 3: Confirm Past Unclosed Checkout Form
    const defaultPastTargetTime = unclosedPastAttendance?.check_in_at
        ? new Date(
              new Date(unclosedPastAttendance.check_in_at).getTime() +
                  (unclosedPastAttendance.target_work_minutes || targetMinutes) * 60000,
          )
              .toTimeString()
              .slice(0, 5)
        : isFieldWorker
        ? '16:00'
        : '17:00';

    const confirmCheckoutForm = useForm({
        attendance_id: unclosedPastAttendance?.id ?? 0,
        check_out_time: defaultPastTargetTime,
        notes: 'Lupa checkout kemarin saat pulang',
    });

    // Case 4: Split Check-Out & Direct Overtime Form
    const splitOvertimeForm = useForm({
        project_id: projects[0]?.id ?? '',
        task_description: '',
    });

    const canCheckInSiteVisit = mode === 'office' || (!!siteProjectId && !!photoFile);

    const handleCheckIn = () => {
        if (!canCheckInSiteVisit) {
            return;
        }

        router.post(
            route('attendance.check-in'),
            {
                mode,
                ...(gps.latitude !== null && gps.longitude !== null
                    ? {
                          latitude: gps.latitude,
                          longitude: gps.longitude,
                          distance_meters: gps.distanceMeters ?? 0,
                      }
                    : {}),
                site_visit_project_id: mode === 'site_visit' ? Number(siteProjectId) : null,
                ...(mode === 'site_visit' && photoFile ? { site_visit_photo: photoFile } : {}),
                notes: notes || null,
                ...(canSimulateWeekend ? { is_weekend: effectiveIsWeekend } : {}),
                compensation_type: effectiveIsWeekend ? compensationType : 'none',
                exchange_date:
                    effectiveIsWeekend && compensationType === 'day_off_exchange' ? exchangeDate : null,
            },
            { forceFormData: true, preserveScroll: true },
        );
    };

    const isOfficeOutOfRadiusForCheckout =
        isWorking &&
        todayAttendance?.mode === 'office' &&
        gps.status === 'ready' &&
        !gps.isWithinRadius;

    const handleCheckOutClick = () => {
        if (isOfficeOutOfRadiusForCheckout) {
            setSiteVisitCheckoutModal(true);
            return;
        }
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
                simulated_minutes: Math.max(1, simulatedMinutes ?? elapsedMinutes),
                ...(gps.latitude !== null && gps.longitude !== null
                    ? {
                          latitude: gps.latitude,
                          longitude: gps.longitude,
                          distance_meters: gps.distanceMeters ?? 0,
                      }
                    : {}),
            },
            { preserveScroll: true },
        );
    };

    const handleSiteVisitCheckoutSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkoutSiteProjectId || !checkoutPhotoFile) {
            setCheckoutError('Proyek tujuan dan foto bukti lokasi wajib diisi.');
            return;
        }
        setCheckoutError(null);
        setCheckoutSubmitting(true);
        router.post(
            route('attendance.check-out'),
            {
                simulated_minutes: Math.max(1, elapsedMinutes),
                checkout_site_visit: 1,
                site_visit_project_id: Number(checkoutSiteProjectId),
                site_visit_photo: checkoutPhotoFile,
                notes: checkoutNotes || '',
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setSiteVisitCheckoutModal(false);
                    setCheckoutPhotoFile(null);
                    setCheckoutPhotoPreview(null);
                    setCheckoutNotes('');
                    setCheckoutError(null);
                },
                onError: (errors) => {
                    const firstErr = Object.values(errors)[0];
                    setCheckoutError(
                        typeof firstErr === 'string'
                            ? firstErr
                            : 'Gagal mengirim check-out site visit. Periksa kembali proyek dan foto bukti.',
                    );
                },
                onFinish: () => setCheckoutSubmitting(false),
            },
        );
    };

    const handleStartOvertime = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canStartOvertime) {
            return;
        }
        router.post(
            route('attendance.overtime.start'),
            {
                ...overtimeForm.data,
                ...(gps.latitude !== null && gps.longitude !== null
                    ? { latitude: gps.latitude, longitude: gps.longitude }
                    : {}),
            },
            {
                preserveScroll: true,
                onSuccess: () => overtimeForm.reset('task_description'),
            },
        );
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

    const handleAdjustmentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        adjustmentForm.post(route('attendance.adjustment'), {
            preserveScroll: true,
            onSuccess: () => {
                setAdjustmentModal(false);
                adjustmentForm.reset('notes');
            },
        });
    };

    const handleConfirmCheckoutSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        confirmCheckoutForm.post(route('attendance.confirm-checkout'), {
            preserveScroll: true,
            onSuccess: () => setConfirmCheckoutModal(false),
        });
    };

    const handleSplitOvertimeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        splitOvertimeForm.post(route('attendance.checkout-and-overtime'), {
            preserveScroll: true,
            onSuccess: () => {
                setSplitOvertimeModal(false);
                splitOvertimeForm.reset('task_description');
            },
        });
    };

    return (
        <>
            <Head title="Presensi Harian" />
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

                        {/* Actions: Koreksi Presensi & Weekend Policy Toggle */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setAdjustmentModal(true)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-accent/40 px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                            >
                                <Clock className="size-3.5 text-primary" />
                                Lupa Absen / Koreksi Jam
                            </button>

                            {canSimulateWeekend && (
                                <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-amber-400 bg-amber-50/70 px-2.5 py-1 text-xs">
                                    <Navigation className="size-3.5 text-amber-700" />
                                    <span className="font-medium text-amber-900">Simulasi GPS Lokal:</span>
                                    <select
                                        value={gpsSimMode}
                                        onChange={(e) =>
                                            setGpsSimMode(e.target.value as 'real' | 'inside' | 'outside')
                                        }
                                        className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-xs font-medium text-amber-950 outline-none"
                                    >
                                        <option value="real">GPS Asli</option>
                                        <option value="inside">Dalam Kantor (15m)</option>
                                        <option value="outside">Luar Kantor (1.6 km)</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs">
                                <CalendarClock className="size-4 text-primary" />
                                <span className="text-muted-foreground">Status Hari:</span>
                                {canSimulateWeekend ? (
                                    <button
                                        type="button"
                                        onClick={() => setWeekendSim(!weekendSim)}
                                        title="Simulasi Lokal: Klik untuk mengubah mode Hari Kerja / Hari Libur"
                                        className={cn(
                                            'cursor-pointer rounded-md px-2 py-0.5 font-medium transition-colors',
                                            effectiveIsWeekend
                                                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200/80'
                                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                                        )}
                                    >
                                        {effectiveIsWeekend
                                            ? isFieldWorker
                                                ? 'Hari Libur (Minggu)'
                                                : 'Akhir Pekan (Sabtu/Minggu)'
                                            : isFieldWorker
                                            ? 'Hari Kerja (Senin–Sabtu)'
                                            : 'Hari Kerja (Senin–Jumat)'}
                                    </button>
                                ) : (
                                    <span
                                        className={cn(
                                            'rounded-md px-2 py-0.5 font-medium',
                                            effectiveIsWeekend
                                                ? 'bg-amber-100 text-amber-900'
                                                : 'bg-secondary text-secondary-foreground',
                                        )}
                                    >
                                        {effectiveIsWeekend
                                            ? isFieldWorker
                                                ? 'Hari Libur (Minggu)'
                                                : 'Akhir Pekan (Sabtu/Minggu)'
                                            : isFieldWorker
                                            ? 'Hari Kerja (Senin–Sabtu)'
                                            : 'Hari Kerja (Senin–Jumat)'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Case 3: Unclosed Past Attendance Alert Banner */}
                    {unclosedPastAttendance && (
                        <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-3.5 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
                                <div className="text-xs leading-relaxed">
                                    <p className="font-semibold text-sm">
                                        Anda belum mengonfirmasi jam pulang untuk tanggal {unclosedPastAttendance.date}
                                    </p>
                                    <p className="text-amber-800">
                                        Tercatat masuk pukul <strong>{unclosedPastAttendance.check_in_time ?? '08:00'} WIB</strong>
                                        {unclosedPastAttendance.is_auto_closed ? ' (ditutup otomatis oleh sistem pukul 23:59)' : ''}. Silakan konfirmasi jam kepulangan Anda sebenarnya agar rekap jam kerja akurat.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setConfirmCheckoutModal(true)}
                                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-amber-800"
                            >
                                <CheckCircle2 className="size-3.5" />
                                Konfirmasi Jam Pulang
                            </button>
                        </div>
                    )}

                    {/* Case 1 & 2: Pending Adjustment Status Banner */}
                    {todayAttendance?.adjustment_status && todayAttendance.adjustment_status !== 'none' && (
                        <div
                            className={cn(
                                'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs',
                                todayAttendance.adjustment_status === 'pending'
                                    ? 'border-primary/30 bg-accent/50 text-foreground'
                                    : todayAttendance.adjustment_status === 'approved'
                                    ? 'border-success/30 bg-success/10 text-success'
                                    : 'border-destructive/30 bg-destructive/10 text-destructive',
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <Sparkles className="size-4 shrink-0 text-primary" />
                                <span>
                                    <strong>Status Koreksi Jam Presensi Hari Ini:</strong>{' '}
                                    {todayAttendance.adjustment_status === 'pending' &&
                                        `Menunggu verifikasi Admin di Pusat Approval (Pengajuan masuk: ${todayAttendance.adjusted_check_in_time || '—'}${todayAttendance.adjusted_check_out_time ? `, pulang: ${todayAttendance.adjusted_check_out_time}` : ''})`}
                                    {todayAttendance.adjustment_status === 'approved' &&
                                        `Pengajuan koreksi jam kerja Anda telah disetujui Admin dan target ${officeSetting.standard_work_hours} jam telah disesuaikan.`}
                                    {todayAttendance.adjustment_status === 'rejected' &&
                                        'Pengajuan koreksi jam kerja ditolak oleh Admin.'}
                                </span>
                            </div>
                            <span className="rounded-full bg-background/80 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase">
                                {todayAttendance.adjustment_status}
                            </span>
                        </div>
                    )}

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
                                        Target kerja {officeSetting.standard_work_hours} jam ({targetMinutes} menit) ·{' '}
                                        {isFieldWorker ? 'Senin–Sabtu (08:00–16:00 WIB)' : `Senin–Jumat (08:00–17:00 WIB) · Radius kantor ${officeSetting.radius_meters}m`}
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
                                        {/* Weekend Compensation Selector (Automatic in prod, toggleable in local env) */}
                                        {effectiveIsWeekend && !isWorking && (
                                            <div className="rounded-xl border border-amber-300/80 bg-amber-50/70 p-4">
                                                <div className="flex items-start gap-2.5">
                                                    <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-700" />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-semibold text-amber-950">
                                                            {isFieldWorker
                                                                ? 'Presensi Hari Libur (Minggu) Terdeteksi'
                                                                : 'Presensi Akhir Pekan (Sabtu / Minggu) Terdeteksi'}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-amber-800">
                                                            {isFieldWorker
                                                                ? 'Hari kerja resmi karyawan lapangan adalah Senin–Sabtu. Pilih kompensasi kehadiran hari Minggu Anda:'
                                                                : 'Hari kerja resmi studio adalah Senin–Jumat. Pilih kompensasi kehadiran akhir pekan Anda:'}
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
                                                                    {isFieldWorker
                                                                        ? 'Pilih 1 hari kerja (Senin–Sabtu) untuk dikunci otomatis sebagai libur pengganti.'
                                                                        : 'Pilih 1 hari kerja (Senin–Jumat) untuk dikunci otomatis sebagai libur pengganti.'}
                                                                </span>
                                                            </button>
                                                        </div>

                                                        {compensationType === 'day_off_exchange' && (
                                                            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                                                                <label className="text-xs font-medium text-amber-950">
                                                                    {isFieldWorker
                                                                        ? 'Pilih Tanggal Libur Pengganti (Senin–Sabtu):'
                                                                        : 'Pilih Tanggal Libur Pengganti (Senin–Jumat):'}
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
                                            <div
                                                className={cn(
                                                    'flex items-start gap-3 rounded-lg border p-3.5',
                                                    gps.status === 'ready' && !gps.isWithinRadius
                                                        ? 'border-destructive/30 bg-destructive/5'
                                                        : 'border-success/25 bg-success/5',
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'flex size-9 shrink-0 items-center justify-center rounded-md',
                                                        gps.status === 'ready' && !gps.isWithinRadius
                                                            ? 'bg-destructive/15 text-destructive'
                                                            : 'bg-success/15 text-success',
                                                    )}
                                                >
                                                    <Navigation className="size-4" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <p className="text-sm font-medium">
                                                            {gps.status === 'loading'
                                                                ? 'Mendeteksi Lokasi GPS...'
                                                                : gps.status === 'error'
                                                                ? 'GPS Tidak Aktif / Izin Ditolak'
                                                                : gps.isWithinRadius
                                                                ? 'Validasi GPS Kantor: Dalam Radius'
                                                                : 'Di Luar Radius Kantor'}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={cn(
                                                                    'font-mono text-xs font-semibold',
                                                                    gps.status === 'ready' && !gps.isWithinRadius
                                                                        ? 'text-destructive'
                                                                        : 'text-success',
                                                                )}
                                                            >
                                                                {todayAttendance?.check_in_distance_meters !== null &&
                                                                todayAttendance?.check_in_distance_meters !== undefined
                                                                    ? `${todayAttendance.check_in_distance_meters}m`
                                                                    : gps.distanceMeters !== null
                                                                    ? `${gps.distanceMeters}m`
                                                                    : '—'}{' '}
                                                                / {officeSetting.radius_meters}m
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={gps.refresh}
                                                                title="Refresh lokasi GPS"
                                                                className="inline-flex items-center gap-1 rounded border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted"
                                                            >
                                                                <RefreshCw
                                                                    className={cn(
                                                                        'size-3',
                                                                        gps.status === 'loading' && 'animate-spin',
                                                                    )}
                                                                />
                                                                <span>GPS</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                        {gps.status === 'error'
                                                            ? gps.errorMessage
                                                            : `${officeSetting.office_name} · (${officeSetting.latitude}, ${officeSetting.longitude})`}
                                                    </p>
                                                    <div
                                                        className={cn(
                                                            'mt-2 h-1.5 overflow-hidden rounded-full',
                                                            gps.status === 'ready' && !gps.isWithinRadius
                                                                ? 'bg-destructive/15'
                                                                : 'bg-success/15',
                                                        )}
                                                    >
                                                        <div
                                                            className={cn(
                                                                'h-full rounded-full transition-all',
                                                                gps.status === 'ready' && !gps.isWithinRadius
                                                                    ? 'bg-destructive'
                                                                    : 'bg-success',
                                                            )}
                                                            style={{
                                                                width: `${
                                                                    gps.distanceMeters !== null
                                                                        ? Math.min(
                                                                              100,
                                                                              Math.round(
                                                                                  (gps.distanceMeters /
                                                                                      Math.max(
                                                                                          1,
                                                                                          officeSetting.radius_meters,
                                                                                      )) *
                                                                                      100,
                                                                              ),
                                                                          )
                                                                        : 45
                                                                }%`,
                                                            }}
                                                        />
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
                                                        {siteVisitProjects.length === 0 && (
                                                            <option value="">
                                                                {isFieldWorker
                                                                    ? 'Belum ada proyek Pembangunan berjalan'
                                                                    : 'Belum ada proyek aktif'}
                                                            </option>
                                                        )}
                                                        {fieldSiteProjects.length > 0 && (
                                                            <optgroup label="Proyek Pembangunan (Lapangan)">
                                                                {fieldSiteProjects.map((p) => (
                                                                    <option key={p.id} value={p.id}>
                                                                        {p.name} ({p.location || 'Lokasi Proyek'})
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}
                                                        {planningSiteProjects.length > 0 && (
                                                            <optgroup label="Proyek Perencanaan (Survey Lahan)">
                                                                {planningSiteProjects.map((p) => (
                                                                    <option key={p.id} value={p.id}>
                                                                        {p.name} ({p.location || 'Lokasi Proyek'})
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}
                                                    </select>
                                                    {isFieldWorker && (
                                                        <p className="text-[11px] text-muted-foreground">
                                                            Sebagai karyawan lapangan, hanya proyek Pembangunan / Desain &amp; Bangun yang ditampilkan.
                                                        </p>
                                                    )}

                                                    <label className="mt-1 text-xs font-medium text-muted-foreground">
                                                        Uraian Kegiatan Lapangan (Opsional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        disabled={isWorking}
                                                        value={notes}
                                                        onChange={(e) => setNotes(e.target.value)}
                                                        placeholder="Opsional: Contoh cek progres bekisting lantai 2"
                                                        className="h-9 rounded-lg border bg-card px-3 text-sm outline-none focus-visible:border-ring"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                                        Foto Bukti Lokasi Proyek *
                                                    </label>
                                                    {photoPreview || todayAttendance?.site_visit_photo_url ? (
                                                        <div className="relative overflow-hidden rounded-lg border">
                                                            <img
                                                                src={
                                                                    photoPreview ||
                                                                    todayAttendance?.site_visit_photo_url ||
                                                                    '/project-covers/interior-kafe.png'
                                                                }
                                                                alt="Bukti Site Visit"
                                                                className="h-28 w-full object-cover"
                                                            />
                                                            {!isWorking && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setPhotoPreview(null);
                                                                        setPhotoFile(null);
                                                                    }}
                                                                    className="absolute top-2 right-2 rounded-md bg-background/90 p-1 text-foreground shadow-xs"
                                                                >
                                                                    <X className="size-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card px-3 text-center">
                                                            <div className="flex flex-wrap items-center justify-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={isWorking}
                                                                    onClick={() => {
                                                                        setCameraTarget('checkin');
                                                                        setCameraOpen(true);
                                                                    }}
                                                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                                                >
                                                                    <Camera className="size-3.5" />
                                                                    Kamera Laptop / HP
                                                                </button>
                                                                <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted">
                                                                    Lampirkan Foto
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="sr-only"
                                                                        onChange={(e) => {
                                                                            const f = e.target.files?.[0];
                                                                            if (f) {
                                                                                setPhotoFile(f);
                                                                                setPhotoPreview(URL.createObjectURL(f));
                                                                            }
                                                                        }}
                                                                    />
                                                                </label>
                                                            </div>
                                                            <span className="text-[11px] text-muted-foreground">
                                                                Wajib ambil foto langsung atau lampirkan foto lokasi
                                                            </span>
                                                        </div>
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
                                                    <span className="text-muted-foreground">
                                                        Target Pulang (+{officeSetting.standard_work_hours}j)
                                                    </span>
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
                                                    disabled={!canCheckInSiteVisit}
                                                    onClick={handleCheckIn}
                                                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <LogIn className="size-4" />
                                                    {hasCheckedOut
                                                        ? 'Check-in Ulang Hari Ini'
                                                        : mode === 'office'
                                                        ? 'Check-in Kantor Sekarang'
                                                        : !siteProjectId
                                                        ? 'Pilih Proyek Terlebih Dahulu'
                                                        : !photoFile
                                                        ? 'Wajib Ambil / Lampirkan Foto Lokasi'
                                                        : 'Kirim Check-in Site Visit'}
                                                </button>
                                            ) : (
                                                <div className="flex w-full flex-col gap-2">
                                                    {isOfficeOutOfRadiusForCheckout && (
                                                        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
                                                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                                                            <span>
                                                                Anda terdeteksi di luar radius kantor (
                                                                <strong>{gps.distanceMeters} m</strong>). Check-out kantor
                                                                wajib di dalam area studio, atau klik{' '}
                                                                <strong>Pulang dari Site Visit</strong> untuk melampirkan foto
                                                                bukti lokasi proyek.
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={isOfficeOutOfRadiusForCheckout}
                                                            onClick={handleCheckOutClick}
                                                            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <LogOut className="size-4" />
                                                            Check-out Pulang
                                                        </button>
                                                        {todayAttendance?.mode === 'office' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSiteVisitCheckoutModal(true)}
                                                                className={cn(
                                                                    'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors',
                                                                    isOfficeOutOfRadiusForCheckout
                                                                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                                                                        : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
                                                                )}
                                                            >
                                                                <Camera className="size-3.5" />
                                                                Pulang dari Site Visit
                                                            </button>
                                                        )}
                                                        {!hasCompletedOvertimeToday && !isLockedDay && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSplitOvertimeModal(true)}
                                                                title="Lupa absen pulang & langsung lanjut lembur malam tanpa tunggu 1 jam"
                                                                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary/15 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
                                                            >
                                                                <Timer className="size-3.5" />
                                                                Check-out &amp; Langsung Lembur
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
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
                                {isLockedDay ? (
                                    <div className="flex flex-1 flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed bg-muted/30 p-5 text-center">
                                        <span className="flex size-10 items-center justify-center rounded-full bg-purple-100 text-purple-800">
                                            <Lock className="size-5" />
                                        </span>
                                        <p className="text-sm font-semibold">
                                            Lembur Dinonaktifkan Hari Ini
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Anda sedang terdaftar atau memiliki pengajuan{' '}
                                            <strong>Izin / Cuti / Sakit / Ganti Hari</strong> untuk hari ini.
                                        </p>
                                    </div>
                                ) : activeOvertime ? (
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
                                ) : hasCompletedOvertimeToday && todayOvertime ? (
                                    <div className="flex flex-1 flex-col justify-between gap-4">
                                        <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                                                    <CheckCircle2 className="size-3.5" />
                                                    Lembur Hari Ini Selesai
                                                </span>
                                                <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase">
                                                    {todayOvertime.status}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm font-semibold">
                                                {todayOvertime.project_name}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {todayOvertime.task_description}
                                            </p>
                                            <p className="mt-2 font-mono text-xs text-muted-foreground">
                                                {todayOvertime.start_time} – {todayOvertime.end_time ?? '—'} WIB (
                                                {todayOvertime.duration_minutes ?? 0} menit)
                                            </p>
                                        </div>

                                        <div className="rounded-lg border border-dashed bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
                                            Sesi lembur hari ini sudah tercatat. Setiap karyawan hanya dapat mengajukan lembur <strong>1 kali per hari</strong>.
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleStartOvertime} className="flex flex-1 flex-col gap-3">
                                        {!hasCheckedOut ? (
                                            <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
                                                <span>
                                                    Selesaikan jam kerja normal &amp; lakukan <strong>Check-out</strong> terlebih dahulu.{' '}
                                                    {officeSetting.overtime_cooldown_minutes === 0
                                                        ? 'Tombol lembur akan langsung aktif setelah check-out.'
                                                        : `Tombol lembur akan aktif setelah jeda istirahat ${
                                                              officeSetting.overtime_cooldown_minutes >= 60 &&
                                                              officeSetting.overtime_cooldown_minutes % 60 === 0
                                                                  ? `${officeSetting.overtime_cooldown_minutes / 60} jam`
                                                                  : `${officeSetting.overtime_cooldown_minutes} menit`
                                                          }.`}
                                                </span>
                                                {isWorking && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSplitOvertimeModal(true)}
                                                        className="inline-flex items-center gap-1.5 self-start rounded-md bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/25"
                                                    >
                                                        <Sparkles className="size-3" />
                                                        Lupa Check-out? Split 9 Jam & Langsung Lembur
                                                    </button>
                                                )}
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
                                        ) : isOfficeGpsBlockedForOvertime ? (
                                            <div className="rounded-lg border border-destructive/35 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
                                                Anda berada di luar radius kantor (
                                                {gps.distanceMeters !== null
                                                    ? `${gps.distanceMeters}m`
                                                    : 'GPS belum aktif'}{' '}
                                                / maks {officeSetting.radius_meters}m). Lembur kantor hanya dapat dimulai di area studio.
                                            </div>
                                        ) : isSiteVisitToday ? (
                                            <div className="rounded-lg border border-sky-300 bg-sky-50 px-3.5 py-2 text-xs font-medium text-sky-900">
                                                Mode Site Visit Lapangan: Lembur dapat dimulai dari lokasi proyek &amp; diverifikasi Admin di Pusat Approval.
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border border-success/30 bg-success/10 px-3.5 py-2 text-xs font-medium text-success">
                                                {officeSetting.overtime_cooldown_minutes === 0
                                                    ? 'Anda berada dalam radius kantor & dapat memulai lembur sekarang.'
                                                    : `Jeda istirahat ${
                                                          officeSetting.overtime_cooldown_minutes >= 60 &&
                                                          officeSetting.overtime_cooldown_minutes % 60 === 0
                                                              ? `${officeSetting.overtime_cooldown_minutes / 60} jam`
                                                              : `${officeSetting.overtime_cooldown_minutes} menit`
                                                      } selesai · Anda berada dalam radius kantor & dapat memulai lembur sekarang.`}
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
                                                {projects.length === 0 ? (
                                                    <option value="">
                                                        {isFieldWorker
                                                            ? 'Belum ada proyek Lapangan aktif'
                                                            : 'Belum ada proyek Perencanaan aktif'}
                                                    </option>
                                                ) : isAdmin ? (
                                                    <>
                                                        {projects.some((p) => p.group === 'lapangan') && (
                                                            <optgroup label="Proyek Lapangan (Pembangunan)">
                                                                {projects
                                                                    .filter((p) => p.group === 'lapangan')
                                                                    .map((p) => (
                                                                        <option key={p.id} value={p.id}>
                                                                            {p.name}
                                                                        </option>
                                                                    ))}
                                                            </optgroup>
                                                        )}
                                                        {projects.some((p) => p.group !== 'lapangan') && (
                                                            <optgroup label="Proyek Perencanaan">
                                                                {projects
                                                                    .filter((p) => p.group !== 'lapangan')
                                                                    .map((p) => (
                                                                        <option key={p.id} value={p.id}>
                                                                            {p.name}
                                                                        </option>
                                                                    ))}
                                                            </optgroup>
                                                        )}
                                                    </>
                                                ) : (
                                                    projects.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name}
                                                        </option>
                                                    ))
                                                )}
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
                                        dari target {officeSetting.standard_work_hours} jam ({targetMinutes} menit). Checkout sekarang akan mencatat kekurangan{' '}
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

                {/* Modal Case 1 & 2: Pengajuan Koreksi Presensi / Lupa Absen */}
                {adjustmentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-black/30 backdrop-blur-xs"
                            onClick={() => setAdjustmentModal(false)}
                        />
                        <form
                            onSubmit={handleAdjustmentSubmit}
                            className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl"
                        >
                            <div className="flex items-center justify-between border-b pb-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="size-5 text-primary" />
                                    <h3 className="text-base font-semibold">
                                        Ajukan Koreksi Presensi / Lupa Absen
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAdjustmentModal(false)}
                                    className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            <div className="mt-4 flex flex-col gap-3.5">
                                <div>
                                    <label className="mb-1 block text-xs font-medium">Jenis Koreksi *</label>
                                    <select
                                        value={adjustmentForm.data.adjustment_type}
                                        onChange={(e) =>
                                            adjustmentForm.setData(
                                                'adjustment_type',
                                                e.target.value as 'check_in' | 'check_out' | 'full_day',
                                            )
                                        }
                                        className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none"
                                    >
                                        <option value="check_in">Lupa Absen Masuk (Koreksi Jam Masuk)</option>
                                        <option value="check_out">Lupa Absen Pulang (Koreksi Jam Pulang)</option>
                                        <option value="full_day">Absen Susulan Seharian (Masuk & Pulang)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium">Tanggal *</label>
                                    <input
                                        type="date"
                                        required
                                        max={todayDate}
                                        value={adjustmentForm.data.date}
                                        onChange={(e) => adjustmentForm.setData('date', e.target.value)}
                                        className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {(adjustmentForm.data.adjustment_type === 'check_in' ||
                                        adjustmentForm.data.adjustment_type === 'full_day') && (
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Jam Masuk Sebenarnya *
                                            </label>
                                            <input
                                                type="time"
                                                required
                                                value={adjustmentForm.data.adjusted_check_in_time}
                                                onChange={(e) =>
                                                    adjustmentForm.setData('adjusted_check_in_time', e.target.value)
                                                }
                                                className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none"
                                            />
                                        </div>
                                    )}

                                    {(adjustmentForm.data.adjustment_type === 'check_out' ||
                                        adjustmentForm.data.adjustment_type === 'full_day') && (
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">
                                                Jam Pulang Sebenarnya *
                                            </label>
                                            <input
                                                type="time"
                                                required
                                                value={adjustmentForm.data.adjusted_check_out_time}
                                                onChange={(e) =>
                                                    adjustmentForm.setData('adjusted_check_out_time', e.target.value)
                                                }
                                                className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium">
                                        Alasan / Keterangan Bukti *
                                    </label>
                                    <textarea
                                        rows={3}
                                        required
                                        value={adjustmentForm.data.notes}
                                        onChange={(e) => adjustmentForm.setData('notes', e.target.value)}
                                        placeholder="Contoh: Sudah standby di studio sejak 08:00, langsung koordinasi site plan dengan Lead Architect…"
                                        className="w-full rounded-lg border bg-background p-2.5 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAdjustmentModal(false)}
                                    className="h-9 rounded-lg border bg-card px-3.5 text-xs font-medium hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={adjustmentForm.processing}
                                    className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    Kirim ke Pusat Approval
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Modal Case 3: Konfirmasi Jam Pulang Kemarin */}
                {confirmCheckoutModal && unclosedPastAttendance && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-black/30 backdrop-blur-xs"
                            onClick={() => setConfirmCheckoutModal(false)}
                        />
                        <form
                            onSubmit={handleConfirmCheckoutSubmit}
                            className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl"
                        >
                            <div className="flex items-start gap-3 border-b pb-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                                    <AlertTriangle className="size-5" />
                                </span>
                                <div>
                                    <h3 className="text-base font-semibold">
                                        Konfirmasi Jam Pulang ({unclosedPastAttendance.date})
                                    </h3>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Jam masuk tercatat pukul{' '}
                                        <strong>{unclosedPastAttendance.check_in_time ?? '08:00'} WIB</strong>.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-3.5">
                                <div>
                                    <label className="mb-1 block text-xs font-medium">
                                        Jam Pulang Sebenarnya (WIB) *
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={confirmCheckoutForm.data.check_out_time}
                                        onChange={(e) =>
                                            confirmCheckoutForm.setData('check_out_time', e.target.value)
                                        }
                                        className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium">Catatan (Opsional)</label>
                                    <textarea
                                        rows={2}
                                        value={confirmCheckoutForm.data.notes}
                                        onChange={(e) => confirmCheckoutForm.setData('notes', e.target.value)}
                                        className="w-full rounded-lg border bg-background p-2.5 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmCheckoutModal(false)}
                                    className="h-9 rounded-lg border bg-card px-3.5 text-xs font-medium hover:bg-muted"
                                >
                                    Tutup
                                </button>
                                <button
                                    type="submit"
                                    disabled={confirmCheckoutForm.processing}
                                    className="h-9 rounded-lg bg-amber-700 px-4 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
                                >
                                    Simpan Jam Pulang
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Modal Case 4: Split Check-Out & Direct Overtime */}
                {splitOvertimeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-black/30 backdrop-blur-xs"
                            onClick={() => setSplitOvertimeModal(false)}
                        />
                        <form
                            onSubmit={handleSplitOvertimeSubmit}
                            className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl"
                        >
                            <div className="flex items-start gap-3 border-b pb-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                                    <Timer className="size-5" />
                                </span>
                                <div>
                                    <h3 className="text-base font-semibold">
                                        Check-out Reguler & Langsung Lembur
                                    </h3>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Lupa check-out saat masuk jam lembur? Sistem membagi waktu kerja Anda secara adil:
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed">
                                <ul className="space-y-1">
                                    <li>
                                        • <strong>{officeSetting.standard_work_hours} Jam Kerja Reguler:</strong> Diselesaikan otomatis (0 mnt kurang jam)
                                    </li>
                                    <li>
                                        • <strong>Jeda Istirahat:</strong> Dihitung otomatis setelah target {officeSetting.standard_work_hours} jam
                                    </li>
                                    <li>
                                        • <strong>Sesi Lembur Malam:</strong> Langsung aktif berjalan tanpa tunggu lagi
                                    </li>
                                </ul>
                            </div>

                            <div className="mt-4 flex flex-col gap-3.5">
                                <div>
                                    <label className="mb-1 block text-xs font-medium">
                                        Proyek yang Dilemburkan *
                                    </label>
                                    <select
                                        required
                                        value={splitOvertimeForm.data.project_id}
                                        onChange={(e) =>
                                            splitOvertimeForm.setData('project_id', Number(e.target.value))
                                        }
                                        className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none"
                                    >
                                        {projects.length === 0 ? (
                                            <option value="">
                                                {isFieldWorker
                                                    ? 'Belum ada proyek Lapangan aktif'
                                                    : 'Belum ada proyek Perencanaan aktif'}
                                            </option>
                                        ) : auth?.user?.role === 'admin' ? (
                                            <>
                                                {projects.some((p) => p.group === 'lapangan') && (
                                                    <optgroup label="Proyek Lapangan (Pembangunan)">
                                                        {projects
                                                            .filter((p) => p.group === 'lapangan')
                                                            .map((p) => (
                                                                <option key={p.id} value={p.id}>
                                                                    {p.name}
                                                                </option>
                                                            ))}
                                                    </optgroup>
                                                )}
                                                {projects.some((p) => p.group !== 'lapangan') && (
                                                    <optgroup label="Proyek Perencanaan">
                                                        {projects
                                                            .filter((p) => p.group !== 'lapangan')
                                                            .map((p) => (
                                                                <option key={p.id} value={p.id}>
                                                                    {p.name}
                                                                </option>
                                                            ))}
                                                    </optgroup>
                                                )}
                                            </>
                                        ) : (
                                            projects.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium">
                                        Target / Uraian Tugas Lembur *
                                    </label>
                                    <textarea
                                        rows={3}
                                        required
                                        value={splitOvertimeForm.data.task_description}
                                        onChange={(e) =>
                                            splitOvertimeForm.setData('task_description', e.target.value)
                                        }
                                        placeholder="Contoh: Finalisasi gambar kerja tender & render fasad…"
                                        className="w-full rounded-lg border bg-background p-2.5 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSplitOvertimeModal(false)}
                                    className="h-9 rounded-lg border bg-card px-3.5 text-xs font-medium hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={splitOvertimeForm.processing}
                                    className="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    Selesaikan Reguler & Mulai Lembur
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                {/* Site Visit Check-out Modal (Pulang dari Site Visit dengan Foto Bukti) */}
                {siteVisitCheckoutModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-black/35 backdrop-blur-xs"
                            onClick={() => setSiteVisitCheckoutModal(false)}
                        />
                        <form
                            onSubmit={handleSiteVisitCheckoutSubmit}
                            className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border bg-card p-6 shadow-xl"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="text-base font-semibold">
                                        Check-out dari Site Visit (Luar Kantor)
                                    </h3>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Khusus jika pagi check-in di kantor lalu sore pulang langsung dari lokasi proyek. Foto bukti akan masuk ke Pusat Approval Super Admin.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSiteVisitCheckoutModal(false)}
                                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            <div className="mt-4 flex flex-col gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium">
                                        Pilih Proyek Lokasi Site Visit *
                                    </label>
                                    <select
                                        required
                                        value={checkoutSiteProjectId}
                                        onChange={(e) => setCheckoutSiteProjectId(e.target.value)}
                                        className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring"
                                    >
                                        {siteVisitProjects.length === 0 && (
                                            <option value="">Belum ada proyek aktif</option>
                                        )}
                                        {fieldSiteProjects.length > 0 && (
                                            <optgroup label="Proyek Pembangunan (Lapangan)">
                                                {fieldSiteProjects.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} ({p.location || 'Lokasi Proyek'})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                        {planningSiteProjects.length > 0 && (
                                            <optgroup label="Proyek Perencanaan (Survey Lahan)">
                                                {planningSiteProjects.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} ({p.location || 'Lokasi Proyek'})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium">
                                        Foto Bukti Lokasi Proyek *
                                    </label>
                                    {checkoutPhotoPreview ? (
                                        <div className="relative overflow-hidden rounded-lg border">
                                            <img
                                                src={checkoutPhotoPreview}
                                                alt="Bukti Check-out Site Visit"
                                                className="h-40 w-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCheckoutPhotoFile(null);
                                                    setCheckoutPhotoPreview(null);
                                                }}
                                                className="absolute top-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-white hover:bg-black"
                                            >
                                                Ganti Foto
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 p-4 text-center">
                                            <div className="flex flex-wrap items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCameraTarget('checkout');
                                                        setCameraOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                                >
                                                    <Camera className="size-3.5" />
                                                    Ambil Foto Kamera
                                                </button>
                                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">
                                                    <Upload className="size-3.5" />
                                                    Pilih dari Galeri
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="sr-only"
                                                        onChange={(e) => {
                                                            const f = e.target.files?.[0];
                                                            if (f) {
                                                                setCheckoutPhotoFile(f);
                                                                setCheckoutPhotoPreview(URL.createObjectURL(f));
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground">
                                                Wajib melampirkan foto bukti berada di lokasi proyek
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium">
                                        Catatan Kegiatan Lapangan (Opsional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={checkoutNotes}
                                        onChange={(e) => setCheckoutNotes(e.target.value)}
                                        placeholder="Contoh: Selesai survey lokasi Pak Dede pukul 17:15, langsung pulang dari lokasi."
                                        className="w-full rounded-lg border bg-background p-2.5 text-sm outline-none focus-visible:border-ring"
                                    />
                                </div>
                            </div>

                            {checkoutError && (
                                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                    {checkoutError}
                                </div>
                            )}

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSiteVisitCheckoutModal(false)}
                                    className="h-9 rounded-lg border bg-card px-3.5 text-xs font-medium hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={checkoutSubmitting || !checkoutSiteProjectId || !checkoutPhotoFile}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <LogOut className="size-3.5" />
                                    {checkoutSubmitting ? 'Mengirim…' : 'Kirim Check-out Site Visit'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </AppShell>

            <CameraCaptureModal
                open={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={(file, preview) => {
                    if (cameraTarget === 'checkout') {
                        setCheckoutPhotoFile(file);
                        setCheckoutPhotoPreview(preview);
                    } else {
                        setPhotoFile(file);
                        setPhotoPreview(preview);
                    }
                }}
            />
        </>
    );
}
