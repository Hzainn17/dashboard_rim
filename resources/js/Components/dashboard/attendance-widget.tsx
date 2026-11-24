import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    AlertTriangle,
    Building2,
    Camera,
    Clock,
    HardHat,
    LogIn,
    LogOut,
    MapPin,
    Navigation,
    RefreshCw,
    Timer,
    X,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { useOfficeGps } from '@/lib/geolocation';
import { CameraCaptureModal } from '@/Components/CameraCaptureModal';
import { cn } from '@/lib/utils';
import { formatClock, formatCooldown, formatDuration, useAttendance, type AttendanceMode } from './attendance-context';

export function AttendanceWidget() {
    const { auth, officeSetting, siteVisitProjects = [] } = usePage<
        PageProps & {
            officeSetting?: {
                office_name: string;
                latitude: number;
                longitude: number;
                radius_meters: number;
            };
        }
    >().props;
    const isFieldWorker = auth?.workType === 'lapangan';
    const targetWorkHours = auth?.targetWorkHours ?? (isFieldWorker ? 8 : 9);
    const targetWorkMinutes = auth?.todayAttendance?.target_work_minutes ?? auth?.targetWorkMinutes ?? targetWorkHours * 60;
    const TARGET_MS = targetWorkMinutes * 60 * 1000;
    const toItem = (p: (typeof siteVisitProjects)[number]) => ({
        value: String(p.id),
        label: p.location ? `${p.name} (${p.location})` : p.name,
    });
    const fieldProjectItems = siteVisitProjects.filter((p) => p.group === 'lapangan').map(toItem);
    const planningProjectItems = siteVisitProjects.filter((p) => p.group === 'perencanaan').map(toItem);
    const projectItems = [...fieldProjectItems, ...planningProjectItems];
    const gps = useOfficeGps(
        Number(officeSetting?.latitude ?? -6.2087634),
        Number(officeSetting?.longitude ?? 106.845599),
        officeSetting?.radius_meters ?? 100,
    );
    const radiusMeters = officeSetting?.radius_meters ?? 100;
    const officeName = officeSetting?.office_name ?? 'RIM Studio Arsitektur';

    const unclosedPast = auth?.unclosedPastAttendance;
    const todayOvertime = auth?.todayOvertime ?? null;
    const activeOvertime = auth?.activeOvertime ?? null;
    const hasLeaveToday = auth?.hasLeaveToday ?? false;
    const isLockedDay =
        ['ganti_hari', 'izin', 'cuti', 'sakit'].includes(auth?.todayAttendance?.status ?? '') ||
        hasLeaveToday;
    const hasCompletedOvertimeToday = !!todayOvertime && todayOvertime.status !== 'active';

    const {
        mode,
        setMode,
        checkedInAt,
        checkedOutAt,
        elapsedMs,
        cooldownRemainingSeconds,
        checkIn,
        checkOut,
        siteProject,
        setSiteProject,
    } = useAttendance();
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [siteNotes, setSiteNotes] = useState(auth?.todayAttendance?.notes ?? '');
    const [earlyCheckoutModal, setEarlyCheckoutModal] = useState(false);

    useEffect(() => {
        if (auth?.todayAttendance?.notes != null) {
            setSiteNotes(auth.todayAttendance.notes);
        }
    }, [auth?.todayAttendance?.notes]);

    const displayedPhotoUrl = photoUrl || auth?.todayAttendance?.site_visit_photo_url || null;

    useEffect(() => {
        return () => {
            if (photoUrl) URL.revokeObjectURL(photoUrl);
        };
    }, [photoUrl]);

    const isWorking = !!checkedInAt && !checkedOutAt;
    const elapsed = elapsedMs;
    const elapsedMinutes = Math.floor(elapsed / 60000);
    const shortageMinutes = Math.max(0, targetWorkMinutes - elapsedMinutes);
    const progress = Math.min(100, (elapsed / TARGET_MS) * 100);
    const overtime = Math.max(0, elapsed - TARGET_MS);
    const targetEnd = checkedInAt ? new Date(checkedInAt.getTime() + TARGET_MS) : null;
    const siteReady = mode === 'office' || (!!siteProject && (!!photoFile || !!auth?.todayAttendance?.site_visit_photo_url));

    const isOfficeOutOfRadius =
        isWorking && mode === 'office' && gps.status === 'ready' && !gps.isWithinRadius;

    const handleCheckOutClick = () => {
        if (isOfficeOutOfRadius) {
            router.visit(route('attendance.index'));
            return;
        }
        if (elapsed < TARGET_MS) {
            setEarlyCheckoutModal(true);
            return;
        }
        checkOut({
            latitude: gps.latitude,
            longitude: gps.longitude,
            distance_meters: gps.distanceMeters,
        });
    };

    return (
        <section
            aria-labelledby="attendance-title"
            className="flex flex-col rounded-xl border border-primary/50 bg-gradient-to-b from-accent/65 via-accent/25 to-card shadow-[0_8px_28px_-6px_rgb(70_121_123/0.22)] ring-1 ring-primary/20"
        >
            {/* Header — flush-aligned with Agenda Studio & Aktivitas Tim */}
            <div className="flex items-center justify-between gap-3 rounded-t-xl border-b border-primary/20 bg-accent/60 px-5 py-4">
                <div className="flex items-center gap-2.5">
                    <span className="h-7 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <div>
                        <h2 id="attendance-title" className="text-sm font-semibold text-foreground">
                            Presensi Hari Ini
                        </h2>
                        <p className="text-xs text-accent-foreground/80">
                            {isFieldWorker
                                ? `Target kerja ${targetWorkHours} jam · Senin–Sabtu (08:00–16:00 WIB)`
                                : `Target kerja ${targetWorkHours} jam · Senin–Jumat (08:00–17:00 WIB)`}
                        </p>
                    </div>
                </div>
                <ModeToggle mode={mode} onChange={setMode} disabled={isWorking} />
            </div>

            <div className="flex flex-1 flex-col gap-4 p-5">
                {unclosedPast && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                        <span className="truncate">
                            Belum check-out <strong>{unclosedPast.date_formatted}</strong>
                        </span>
                        <button
                            type="button"
                            onClick={() => router.visit(route('attendance.index', { confirm_checkout: 1 }))}
                            className="shrink-0 font-semibold text-amber-800 underline hover:text-amber-950"
                        >
                            Konfirmasi
                        </button>
                    </div>
                )}

                {mode === 'office' ? (
                    <div
                        className={cn(
                            'flex items-start gap-3 rounded-lg border bg-card/95 p-3 shadow-2xs',
                            gps.status === 'ready' && !gps.isWithinRadius
                                ? 'border-destructive/40'
                                : 'border-success/35',
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
                            <Navigation className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">
                                    {gps.status === 'loading'
                                        ? 'Mendeteksi GPS...'
                                        : gps.status === 'error'
                                            ? 'GPS Tidak Aktif'
                                            : gps.isWithinRadius
                                                ? 'Dalam Radius Kantor'
                                                : 'Di Luar Radius Kantor'}
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className={cn(
                                            'font-mono text-xs font-semibold',
                                            gps.status === 'ready' && !gps.isWithinRadius
                                                ? 'text-destructive'
                                                : 'text-success',
                                        )}
                                    >
                                        {gps.distanceMeters !== null ? `${gps.distanceMeters}m` : '—'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={gps.refresh}
                                        title="Refresh GPS"
                                        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                        <RefreshCw
                                            className={cn('size-3', gps.status === 'loading' && 'animate-spin')}
                                        />
                                    </button>
                                </div>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                                {gps.status === 'error' ? gps.errorMessage : officeName}
                            </p>
                            <div
                                className={cn(
                                    'mt-2 h-1 overflow-hidden rounded-full',
                                    gps.status === 'ready' && !gps.isWithinRadius
                                        ? 'bg-destructive/15'
                                        : 'bg-success/15',
                                )}
                                aria-hidden="true"
                            >
                                <div
                                    className={cn(
                                        'h-full rounded-full transition-all',
                                        gps.status === 'ready' && !gps.isWithinRadius
                                            ? 'bg-destructive'
                                            : 'bg-success',
                                    )}
                                    style={{
                                        width: `${gps.distanceMeters !== null
                                            ? Math.min(
                                                100,
                                                Math.round((gps.distanceMeters / Math.max(1, radiusMeters)) * 100),
                                            )
                                            : 45
                                            }%`,
                                    }}
                                />
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                Radius maksimum {radiusMeters}m
                                {gps.accuracy !== null ? ` · Akurasi GPS ±${gps.accuracy}m` : ''}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-card/95 p-3 shadow-2xs">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground" id="site-project-label">
                                Proyek Site Visit
                            </label>
                            <Select
                                items={projectItems}
                                value={siteProject}
                                onValueChange={(v) => setSiteProject(v as string | null)}
                                disabled={isWorking}
                            >
                                <SelectTrigger className="h-9 w-full bg-background" aria-labelledby="site-project-label">
                                    <SelectValue placeholder="Pilih proyek lapangan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {fieldProjectItems.length > 0 && (
                                        <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold tracking-wider text-primary uppercase">
                                            Proyek Pembangunan (Lapangan)
                                        </div>
                                    )}
                                    {fieldProjectItems.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                    {planningProjectItems.length > 0 && (
                                        <div className="mt-1 border-t px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            Proyek Perencanaan (Survey)
                                        </div>
                                    )}
                                    {planningProjectItems.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {projectItems.length === 0 && (
                                <p className="text-[11px] text-amber-700">
                                    {isFieldWorker
                                        ? 'Belum ada proyek Pembangunan yang sedang berjalan. Hubungi admin.'
                                        : 'Belum ada proyek aktif.'}
                                </p>
                            )}
                        </div>

                        {displayedPhotoUrl ? (
                            <div className="relative overflow-hidden rounded-lg border">
                                <img src={displayedPhotoUrl} alt="Foto bukti lokasi site visit" className="h-28 w-full object-cover" />
                                {!isWorking && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPhotoUrl(null);
                                            setPhotoFile(null);
                                        }}
                                        className="absolute top-2 right-2 rounded-md bg-background/90 p-1 text-foreground shadow-sm outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/50"
                                    >
                                        <X className="size-3.5" aria-hidden="true" />
                                        <span className="sr-only">Hapus foto</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-4 text-center">
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCameraOpen(true)}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                                    >
                                        <Camera className="size-3.5" aria-hidden="true" />
                                        Kamera Laptop / HP
                                    </button>
                                    <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted">
                                        Lampirkan Foto
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="sr-only"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setPhotoFile(file);
                                                    setPhotoUrl(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                    Wajib foto bukti lokasi proyek (kamera / lampiran)
                                </span>
                            </div>
                        )}
                        <input
                            type="text"
                            disabled={isWorking}
                            value={siteNotes}
                            onChange={(e) => setSiteNotes(e.target.value)}
                            placeholder="Keterangan kegiatan (opsional)"
                            className="h-9 w-full rounded-lg border bg-background px-3 text-xs outline-none focus-visible:border-ring"
                        />
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <MapPin className="size-3" aria-hidden="true" />
                            Lokasi GPS akan direkam otomatis saat check-in
                        </p>
                    </div>
                )}

                <div className="rounded-lg border border-primary/25 bg-card p-4 shadow-2xs">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Durasi kerja</p>
                            <p className="font-mono text-2xl font-semibold tracking-tight text-primary tabular-nums">
                                {formatDuration(elapsed)}
                            </p>
                        </div>
                        <StatusPill isWorking={isWorking} hasCheckedOut={!!checkedOutAt} overtime={overtime} />
                    </div>
                    <div
                        className="mt-3 h-2 overflow-hidden rounded-full bg-accent"
                        role="progressbar"
                        aria-label={`Progres target ${targetWorkHours} jam kerja`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(progress)}
                    >
                        <div
                            className={cn(
                                'h-full rounded-full transition-[width] duration-700',
                                overtime > 0 ? 'bg-warning' : 'bg-primary',
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                        <TimeStat icon={LogIn} label="Masuk" value={checkedInAt ? formatClock(checkedInAt).slice(0, 5) : '—'} />
                        <TimeStat icon={Clock} label="Target pulang" value={targetEnd ? formatClock(targetEnd).slice(0, 5) : '—'} />
                        <TimeStat
                            icon={Timer}
                            label="Lembur"
                            value={overtime > 0 ? `+${formatDuration(overtime, false)}` : '0j 00m'}
                            highlight={overtime > 0}
                        />
                    </div>
                </div>

                {/* Action Button */}
                <div className="mt-auto">
                    {isLockedDay ? (
                        <div className="flex h-10 w-full items-center justify-center rounded-lg border border-dashed bg-muted/40 px-3 text-xs font-medium text-muted-foreground">
                            Hari Ini Terkunci (Izin / Cuti / Sakit / Ganti Hari)
                        </div>
                    ) : isWorking ? (
                        <div className="flex flex-col gap-1.5">
                            {isOfficeOutOfRadius ? (
                                <button
                                    type="button"
                                    onClick={() => router.visit(route('attendance.index'))}
                                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                                >
                                    <Camera className="size-4 text-amber-700" aria-hidden="true" />
                                    Di Luar Kantor · Pulang dari Site Visit →
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleCheckOutClick}
                                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-primary/35 bg-card text-sm font-medium text-foreground transition-colors outline-none hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/30"
                                >
                                    <LogOut className="size-4 text-primary" aria-hidden="true" />
                                    Check-out
                                </button>
                            )}
                            <div className="flex items-center justify-between px-0.5 text-[11px] text-muted-foreground">
                                <button
                                    type="button"
                                    onClick={() => router.visit(route('attendance.index'))}
                                    className="hover:text-foreground hover:underline"
                                >
                                    Koreksi jam masuk?
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.visit(route('attendance.index'))}
                                    className="font-medium text-primary hover:underline"
                                >
                                    Check-out & Langsung Lembur →
                                </button>
                            </div>
                        </div>
                    ) : checkedOutAt ? (
                        <div className="flex flex-col gap-2">
                            {activeOvertime ? (
                                <button
                                    type="button"
                                    onClick={() => router.visit(route('attendance.index'))}
                                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                                >
                                    <Timer className="size-4 animate-pulse" aria-hidden="true" />
                                    Lembur Sedang Berjalan →
                                </button>
                            ) : hasCompletedOvertimeToday ? (
                                <div className="flex h-10 w-full items-center justify-center rounded-lg border border-success/30 bg-success/10 px-3 text-xs font-semibold text-success">
                                    Lembur Hari Ini Selesai (1x/hari · {todayOvertime?.status})
                                </div>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        disabled={cooldownRemainingSeconds > 0}
                                        onClick={() => router.visit(route('attendance.index'))}
                                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Timer className="size-4" aria-hidden="true" />
                                        {cooldownRemainingSeconds > 0
                                            ? `Mulai Lembur (${formatCooldown(cooldownRemainingSeconds)})`
                                            : 'Mulai Lembur Sekarang'}
                                    </button>
                                    <div className="flex items-center justify-between px-0.5 text-[11px] text-muted-foreground">
                                        {cooldownRemainingSeconds > 0 ? (
                                            <span>Jeda wajib sebelum lembur</span>
                                        ) : (
                                            <span className="font-medium text-success">Siap mulai lembur</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                checkIn({
                                                    latitude: gps.latitude,
                                                    longitude: gps.longitude,
                                                    distance_meters: gps.distanceMeters,
                                                })
                                            }
                                            className="hover:text-foreground hover:underline"
                                        >
                                            Check-in Ulang
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() =>
                                checkIn({
                                    latitude: gps.latitude,
                                    longitude: gps.longitude,
                                    distance_meters: gps.distanceMeters,
                                    site_visit_project_id: mode === 'site' ? siteProject : null,
                                    site_visit_photo: mode === 'site' ? photoFile : null,
                                    notes: mode === 'site' ? siteNotes : null,
                                })
                            }
                            disabled={!siteReady}
                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-xs transition-colors outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <LogIn className="size-4" aria-hidden="true" />
                            {mode === 'office' ? 'Check-in Kantor' : 'Check-in Site Visit'}
                        </button>
                    )}
                </div>
            </div>

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
                                        {formatDuration(elapsed, false)}
                                    </strong>{' '}
                                    dari target {targetWorkHours} jam ({targetWorkMinutes} menit). Checkout sekarang akan mencatat kekurangan{' '}
                                    <strong className="text-amber-700">
                                        {shortageMinutes} menit
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
                                onClick={() => {
                                    setEarlyCheckoutModal(false);
                                    checkOut({
                                        latitude: gps.latitude,
                                        longitude: gps.longitude,
                                        distance_meters: gps.distanceMeters,
                                    });
                                }}
                                className="h-9 rounded-lg bg-amber-600 px-3.5 text-xs font-medium text-white hover:bg-amber-700"
                            >
                                Tetap Check-out (Catat Kurang Jam)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CameraCaptureModal
                open={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={(file, preview) => {
                    setPhotoFile(file);
                    setPhotoUrl(preview);
                }}
            />
        </section>
    );
}

function ModeToggle({
    mode,
    onChange,
    disabled,
}: {
    mode: AttendanceMode;
    onChange: (m: AttendanceMode) => void;
    disabled: boolean;
}) {
    const options = [
        { value: 'office' as const, label: 'Kantor', icon: Building2 },
        { value: 'site' as const, label: 'Site Visit', icon: HardHat },
    ];
    return (
        <div role="radiogroup" aria-label="Mode presensi" className="flex shrink-0 rounded-lg border bg-card/80 p-0.5">
            {options.map((opt) => {
                const Icon = opt.icon;
                const selected = mode === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled && !selected}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40',
                            selected ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <Icon className="size-3.5" aria-hidden="true" />
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function StatusPill({ isWorking, hasCheckedOut, overtime }: { isWorking: boolean; hasCheckedOut: boolean; overtime: number }) {
    if (overtime > 0)
        return <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-medium text-amber-800">Lembur aktif</span>;
    if (isWorking)
        return <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">Sedang bekerja</span>;
    if (hasCheckedOut)
        return <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground border">Selesai</span>;
    return <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-accent-foreground">Belum check-in</span>;
}

function TimeStat({
    icon: Icon,
    label,
    value,
    highlight,
}: {
    icon: typeof Clock;
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-muted-foreground">
                <Icon className="size-3" aria-hidden="true" />
                {label}
            </span>
            <span className={cn('font-mono font-medium tabular-nums', highlight && 'text-amber-700')}>{value}</span>
        </div>
    );
}
